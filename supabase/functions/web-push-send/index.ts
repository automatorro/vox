import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode as base64url } from "https://deno.land/std@0.168.0/encoding/base64url.ts";
import { decode as base64urlDecode } from "https://deno.land/std@0.168.0/encoding/base64url.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Convert base64url string to Uint8Array
function b64urlToUint8Array(b64url: string): Uint8Array {
  return base64urlDecode(b64url);
}

// Create JWT for VAPID authentication
async function createVapidJwt(endpoint: string, subject: string, privateKeyD: string): Promise<string> {
  const audience = new URL(endpoint).origin;
  
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: subject,
  };

  const headerB64 = base64url(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64url(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import private key from JWK 'd' parameter
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    {
      kty: "EC",
      crv: "P-256",
      d: privateKeyD,
      // We need x and y from the public key - derive from stored public key
      x: "", y: "", // Will be populated below
    },
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  ).catch(() => null);

  // Alternative: import from raw 'd' value
  const jwk = {
    kty: "EC",
    crv: "P-256",
    d: privateKeyD,
  };

  // We need to reconstruct full JWK - import as PKCS8 instead
  const privateKeyRaw = b64urlToUint8Array(Deno.env.get("VAPID_PRIVATE_KEY")!);
  
  // Try importing as PKCS8 first
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyRaw,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );
  } catch {
    // If PKCS8 fails, try JWK with 'd' parameter
    // For JWK we need x,y from the public key
    const publicKeyRaw = b64urlToUint8Array(Deno.env.get("VAPID_PUBLIC_KEY")!);
    // Uncompressed point: 0x04 || x (32 bytes) || y (32 bytes)
    const x = base64url(publicKeyRaw.slice(1, 33));
    const y = base64url(publicKeyRaw.slice(33, 65));
    
    key = await crypto.subtle.importKey(
      "jwk",
      { kty: "EC", crv: "P-256", d: privateKeyD, x, y },
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );
  }

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format if needed
  const sigArray = new Uint8Array(signature);
  let rawSig: Uint8Array;
  
  if (sigArray.length === 64) {
    rawSig = sigArray;
  } else {
    // DER encoded - parse it
    // DER: 0x30 <len> 0x02 <rlen> <r> 0x02 <slen> <s>
    let offset = 2; // skip 0x30 and total length
    offset++; // skip 0x02
    const rLen = sigArray[offset++];
    const r = sigArray.slice(offset, offset + rLen);
    offset += rLen;
    offset++; // skip 0x02
    const sLen = sigArray[offset++];
    const s = sigArray.slice(offset, offset + sLen);
    
    // Pad/trim to 32 bytes each
    rawSig = new Uint8Array(64);
    rawSig.set(r.length > 32 ? r.slice(r.length - 32) : r, 32 - Math.min(r.length, 32));
    rawSig.set(s.length > 32 ? s.slice(s.length - 32) : s, 64 - Math.min(s.length, 32));
  }

  const signatureB64 = base64url(rawSig);
  return `${unsignedToken}.${signatureB64}`;
}

// Encrypt payload using WebPush (RFC 8291)
async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const p256dhRaw = b64urlToUint8Array(p256dhKey);
  const authRaw = b64urlToUint8Array(authSecret);
  
  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  
  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );
  
  // Import subscriber's public key
  const subscriberKey = await crypto.subtle.importKey(
    "raw",
    p256dhRaw,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );
  
  // ECDH shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberKey },
      localKeyPair.privateKey,
      256
    )
  );
  
  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  // HKDF-based key derivation (RFC 8291)
  const encoder = new TextEncoder();
  
  // PRK = HKDF-Extract(auth_secret, ecdh_secret)
  const authKey = await crypto.subtle.importKey("raw", authRaw, { name: "HKDF" }, false, ["deriveBits"]);
  // Actually we need HMAC for extract step
  const ikmKey = await crypto.subtle.importKey("raw", sharedSecret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  
  // Simplified: use HKDF directly with auth as salt
  const keyInfoPrefix = encoder.encode("WebPush: info\0");
  const keyInfo = new Uint8Array(keyInfoPrefix.length + p256dhRaw.length + localPublicKeyRaw.length);
  keyInfo.set(keyInfoPrefix);
  keyInfo.set(p256dhRaw, keyInfoPrefix.length);
  keyInfo.set(localPublicKeyRaw, keyInfoPrefix.length + p256dhRaw.length);
  
  // Import shared secret for HKDF
  const hkdfKey = await crypto.subtle.importKey("raw", sharedSecret, "HKDF", false, ["deriveBits"]);
  
  // IKM from auth
  const prk = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authRaw, info: keyInfo },
    hkdfKey,
    256
  );
  
  const prkKey = await crypto.subtle.importKey("raw", prk, "HKDF", false, ["deriveBits"]);
  
  // Content encryption key
  const cekInfo = encoder.encode("Content-Encoding: aes128gcm\0");
  const cekBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: cekInfo },
    prkKey,
    128
  );
  
  // Nonce
  const nonceInfo = encoder.encode("Content-Encoding: nonce\0");
  const nonceBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
    prkKey,
    96
  );
  
  // Encrypt with AES-128-GCM
  const contentKey = await crypto.subtle.importKey("raw", cekBits, "AES-GCM", false, ["encrypt"]);
  
  // Add padding (RFC 8188)
  const payloadBytes = encoder.encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 2);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // delimiter
  // rest is zero padding
  
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: new Uint8Array(nonceBits), tagLength: 128 },
      contentKey,
      paddedPayload
    )
  );
  
  // Build aes128gcm content coding header
  // salt (16) + rs (4) + idlen (1) + keyid (65)
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + localPublicKeyRaw.length);
  header.set(salt);
  new DataView(header.buffer).setUint32(16, rs);
  header[20] = localPublicKeyRaw.length;
  header.set(localPublicKeyRaw, 21);
  
  const encrypted = new Uint8Array(header.length + ciphertext.length);
  encrypted.set(header);
  encrypted.set(ciphertext, header.length);
  
  return { encrypted, salt, localPublicKey: localPublicKeyRaw };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, title, body, icon, tag, data } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all push subscriptions for the user
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    if (subError) {
      throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title: title || "DayVox",
      body: body || "",
      icon: icon || "/icon-192.png",
      tag: tag || `dayvox-${Date.now()}`,
      data: data || {},
    });

    const results = [];
    const failedSubscriptions: string[] = [];

    for (const sub of subscriptions) {
      try {
        // Encrypt the payload
        const { encrypted } = await encryptPayload(payload, sub.p256dh, sub.auth);

        // Create VAPID JWT
        const jwt = await createVapidJwt(
          sub.endpoint,
          "mailto:noreply@dayvox.lovable.app",
          vapidPrivateKey
        );

        // Send the push notification
        const response = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/octet-stream",
            "Content-Encoding": "aes128gcm",
            "TTL": "86400",
            "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
            "Urgency": "normal",
          },
          body: encrypted,
        });

        if (response.status === 201 || response.status === 200) {
          results.push({ endpoint: sub.endpoint, success: true });
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expired - remove it
          failedSubscriptions.push(sub.id);
          results.push({ endpoint: sub.endpoint, success: false, status: response.status });
        } else {
          const errorText = await response.text();
          console.error(`Push failed for ${sub.endpoint}: ${response.status} ${errorText}`);
          results.push({ endpoint: sub.endpoint, success: false, status: response.status, error: errorText });
        }
      } catch (err) {
        console.error(`Error sending to ${sub.endpoint}:`, err);
        results.push({ endpoint: sub.endpoint, success: false, error: err.message });
      }
    }

    // Clean up expired subscriptions
    if (failedSubscriptions.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("id", failedSubscriptions);
    }

    const sent = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({ success: true, sent, total: subscriptions.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Web push error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
