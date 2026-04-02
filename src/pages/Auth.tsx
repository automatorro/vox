import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CheckCircle, Calendar, Bell, Mic, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const emailSchema = z.string().email('Email invalid');
const passwordSchema = z.string().min(6, 'Parola trebuie să aibă minim 6 caractere');

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  
  const { signIn, signUp, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    
    if (error) {
      let message = 'Eroare la autentificare';
      if (error.message.includes('Invalid login credentials')) {
        message = 'Email sau parolă incorecte';
      } else if (error.message.includes('Email not confirmed')) {
        message = 'Verifică-ți emailul pentru a confirma contul';
      }
      toast({
        title: 'Eroare',
        description: message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Bine ai venit! 👋',
        description: 'Te-ai autentificat cu succes',
      });
      navigate('/', { replace: true });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    setIsLoading(false);
    
    if (error) {
      let message = 'Eroare la înregistrare';
      if (error.message.includes('User already registered')) {
        message = 'Acest email este deja înregistrat';
      } else if (error.message.includes('Password')) {
        message = 'Parola nu îndeplinește cerințele de securitate';
      }
      toast({
        title: 'Eroare',
        description: message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Cont creat! 🎉',
        description: 'Te poți autentifica acum',
      });
      navigate('/', { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const features = [
    { icon: CheckCircle, text: 'Gestionează taskuri și remindere' },
    { icon: Calendar, text: 'Sincronizare Google Calendar' },
    { icon: Bell, text: 'Notificări inteligente' },
    { icon: Mic, text: 'Control vocal cu AI' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-lg mb-4">
            <Calendar className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            DAYVOX
          </h1>
          <p className="text-muted-foreground mt-2">
            Asistentul tău personal de organizare
          </p>
        </div>

        {/* Features Preview */}
        <div className="flex justify-center gap-6 mb-8">
          {features.map((feature, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground text-center max-w-[60px]">
                {feature.text.split(' ').slice(0, 2).join(' ')}
              </span>
            </div>
          ))}
        </div>

        {showForgotPassword ? (
          <Card className="border-border/50 shadow-xl">
            <CardHeader className="pb-4">
              <Button
                variant="ghost"
                size="sm"
                className="w-fit -ml-2 mb-2"
                onClick={() => { setShowForgotPassword(false); setForgotSent(false); }}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Înapoi
              </Button>
              <CardTitle>Resetare parolă</CardTitle>
              <CardDescription>
                Introdu emailul pentru a primi un link de resetare
              </CardDescription>
            </CardHeader>
            <CardContent>
              {forgotSent ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-foreground font-medium mb-1">Email trimis! 📧</p>
                  <p className="text-sm text-muted-foreground">
                    Verifică-ți inbox-ul (și spam) pentru linkul de resetare.
                  </p>
                </div>
              ) : (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  setIsLoading(true);
                  const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
                    redirectTo: `${window.location.origin}/reset-password`,
                  });
                  setIsLoading(false);
                  if (error) {
                    toast({
                      title: 'Eroare',
                      description: 'Nu s-a putut trimite emailul. Încearcă din nou.',
                      variant: 'destructive',
                    });
                  } else {
                    setForgotSent(true);
                  }
                }} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="email@exemplu.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Se trimite...
                      </>
                    ) : (
                      'Trimite link de resetare'
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ) : (
        <Card className="border-border/50 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle>Autentificare</CardTitle>
            <CardDescription>
              Conectează-te pentru a-ți accesa taskurile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Conectare</TabsTrigger>
                <TabsTrigger value="signup">Înregistrare</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="email@exemplu.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Parolă</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={errors.password ? 'border-destructive' : ''}
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Se conectează...
                      </>
                    ) : (
                      'Conectare'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="link"
                    className="w-full text-sm text-muted-foreground"
                    onClick={() => { setShowForgotPassword(true); setForgotEmail(email); }}
                  >
                    Am uitat parola
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nume complet</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Ion Popescu"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="email@exemplu.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={errors.email ? 'border-destructive' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Parolă</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={errors.password ? 'border-destructive' : ''}
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Se creează contul...
                      </>
                    ) : (
                      'Creează cont'
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        )}
      </div>
    </div>
  );
};

export default Auth;
