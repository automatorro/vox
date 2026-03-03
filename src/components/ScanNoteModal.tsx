import { useState, useRef } from "react";
import { Camera, Upload, Loader2, Check, X, Pencil, Trash2, Plus, ScanLine } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Item, Task, Event as EventType, Reminder, Priority } from "@/types";
import { useToast } from "@/hooks/use-toast";

interface ScannedItem {
  type: "task" | "event" | "reminder";
  title: string;
  description?: string;
  date?: string;
  time?: string;
  priority?: Priority;
  duration?: number;
  selected: boolean;
  editing: boolean;
}

interface ScanNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateItems: (items: Item[]) => Promise<void>;
}

type ScanStep = "upload" | "processing" | "review";

const typeConfig = {
  task: { label: "Task", icon: "✅", color: "bg-task/20 text-task border-task/30" },
  event: { label: "Eveniment", icon: "📅", color: "bg-event/20 text-event border-event/30" },
  reminder: { label: "Reminder", icon: "🔔", color: "bg-reminder/20 text-reminder border-reminder/30" },
};

const priorityOptions: { value: Priority; label: string }[] = [
  { value: "low", label: "Scăzut" },
  { value: "medium", label: "Mediu" },
  { value: "high", label: "Ridicat" },
  { value: "critical", label: "Critic" },
];

export const ScanNoteModal = ({ open, onOpenChange, onCreateItems }: ScanNoteModalProps) => {
  const [step, setStep] = useState<ScanStep>("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [rawText, setRawText] = useState("");
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const reset = () => {
    setStep("upload");
    setImagePreview(null);
    setRawText("");
    setScannedItems([]);
    setIsSaving(false);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) reset();
    onOpenChange(isOpen);
  };

  const processImage = async (base64: string) => {
    setStep("processing");
    try {
      const { data, error } = await supabase.functions.invoke("scan-note", {
        body: { imageBase64: base64, language: "ro" },
      });

      if (error) throw error;

      setRawText(data.rawText || "");
      setScannedItems(
        (data.items || []).map((item: any) => ({
          ...item,
          priority: item.priority || "medium",
          selected: true,
          editing: false,
        }))
      );
      setStep("review");
    } catch (e: any) {
      console.error("Scan error:", e);
      toast({
        title: "Eroare la scanare",
        description: e.message || "Nu am putut procesa imaginea",
        variant: "destructive",
      });
      setStep("upload");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Fișier prea mare", description: "Maxim 10MB", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      processImage(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const toggleSelect = (index: number) => {
    setScannedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const toggleEdit = (index: number) => {
    setScannedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, editing: !item.editing } : item))
    );
  };

  const updateItem = (index: number, updates: Partial<ScannedItem>) => {
    setScannedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...updates } : item))
    );
  };

  const removeItem = (index: number) => {
    setScannedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addManualItem = () => {
    setScannedItems((prev) => [
      ...prev,
      { type: "task", title: "", priority: "medium", selected: true, editing: true },
    ]);
  };

  const handleSave = async () => {
    const selectedItems = scannedItems.filter((item) => item.selected && item.title.trim());
    if (selectedItems.length === 0) {
      toast({ title: "Niciun item selectat", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date();
      const itemsToCreate: Item[] = selectedItems.map((item) => {
        const baseDate = item.date ? new Date(item.date) : new Date();
        if (item.time) {
          const [h, m] = item.time.split(":").map(Number);
          baseDate.setHours(h, m, 0, 0);
        }

        if (item.type === "task") {
          return {
            type: "task" as const,
            title: item.title,
            description: item.description,
            deadline: baseDate,
            priority: item.priority || "medium",
            importance: "low" as const,
            completed: false,
            duration: item.duration,
            createdAt: now,
          } as unknown as Task;
        }
        if (item.type === "event") {
          return {
            type: "event" as const,
            title: item.title,
            startTime: baseDate,
            duration: item.duration || 60,
            synced: false,
            createdAt: now,
          } as unknown as EventType;
        }
        return {
          type: "reminder" as const,
          title: item.title,
          time: baseDate,
          notified: false,
          createdAt: now,
        } as unknown as Reminder;
      });

      await onCreateItems(itemsToCreate);
      toast({
        title: `${itemsToCreate.length} item(e) create din notiță! 📝`,
        description: "Itemele au fost adăugate cu succes",
      });
      handleClose(false);
    } catch (e) {
      console.error("Save error:", e);
      toast({ title: "Eroare la salvare", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedCount = scannedItems.filter((i) => i.selected && i.title.trim()).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Scanează Notiță
          </DialogTitle>
          <DialogDescription>
            {step === "upload" && "Fotografiază sau încarcă o notiță pentru a extrage taskuri, evenimente și remindere."}
            {step === "processing" && "Se procesează imaginea..."}
            {step === "review" && "Revizuiește și editează itemele extrase înainte de salvare."}
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-32 flex flex-col gap-2 border-dashed border-2"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">Fotografiază</span>
                <span className="text-xs text-muted-foreground">Camera telefonului</span>
              </Button>
              <Button
                variant="outline"
                className="h-32 flex flex-col gap-2 border-dashed border-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 text-event" />
                <span className="text-sm font-medium">Încarcă poză</span>
                <span className="text-xs text-muted-foreground">Din galerie</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Suportat: JPG, PNG, WEBP • Max 10MB
            </p>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center gap-4 py-12">
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Scanned note"
                className="w-32 h-32 object-cover rounded-lg border border-border opacity-60"
              />
            )}
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-center">
              <p className="font-medium">Se analizează notița...</p>
              <p className="text-sm text-muted-foreground">AI-ul citește și interpretează textul</p>
            </div>
          </div>
        )}

        {step === "review" && (
          <div className="flex flex-col gap-3 flex-1 min-h-0">
            {/* Raw text preview */}
            {rawText && (
              <details className="group">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                  📄 Text extras (click pentru detalii)
                </summary>
                <Textarea
                  value={rawText}
                  readOnly
                  className="mt-2 text-xs h-20 resize-none bg-muted/50"
                />
              </details>
            )}

            {/* Scanned items list */}
            <ScrollArea className="flex-1 max-h-[40vh]">
              <div className="space-y-2 pr-2">
                {scannedItems.map((item, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border p-3 transition-all ${
                      item.selected ? "border-primary/30 bg-card" : "border-border/50 bg-muted/30 opacity-60"
                    }`}
                  >
                    {item.editing ? (
                      <div className="space-y-2">
                        <Input
                          value={item.title}
                          onChange={(e) => updateItem(index, { title: e.target.value })}
                          placeholder="Titlu item..."
                          className="text-sm"
                        />
                        <div className="flex gap-2">
                          <Select
                            value={item.type}
                            onValueChange={(v) => updateItem(index, { type: v as any })}
                          >
                            <SelectTrigger className="w-[130px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="task">✅ Task</SelectItem>
                              <SelectItem value="event">📅 Eveniment</SelectItem>
                              <SelectItem value="reminder">🔔 Reminder</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={item.priority || "medium"}
                            onValueChange={(v) => updateItem(index, { priority: v as Priority })}
                          >
                            <SelectTrigger className="w-[110px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {priorityOptions.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex gap-2">
                          <Input
                            type="date"
                            value={item.date || ""}
                            onChange={(e) => updateItem(index, { date: e.target.value })}
                            className="text-xs h-8"
                          />
                          <Input
                            type="time"
                            value={item.time || ""}
                            onChange={(e) => updateItem(index, { time: e.target.value })}
                            className="text-xs h-8 w-[100px]"
                          />
                        </div>
                        <Input
                          value={item.description || ""}
                          onChange={(e) => updateItem(index, { description: e.target.value })}
                          placeholder="Descriere (opțional)..."
                          className="text-xs h-8"
                        />
                        <Button size="sm" variant="ghost" onClick={() => toggleEdit(index)} className="text-xs h-7">
                          <Check className="h-3 w-3 mr-1" /> Gata
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => toggleSelect(index)}
                          className={`mt-0.5 h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            item.selected
                              ? "bg-primary border-primary text-primary-foreground"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {item.selected && <Check className="h-3 w-3" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${typeConfig[item.type].color}`}>
                              {typeConfig[item.type].icon} {typeConfig[item.type].label}
                            </Badge>
                            {item.priority && item.priority !== "medium" && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {priorityOptions.find((p) => p.value === item.priority)?.label}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium mt-1 leading-tight">{item.title}</p>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          )}
                          {(item.date || item.time) && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.date && `📅 ${item.date}`} {item.time && `⏰ ${item.time}`}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => toggleEdit(index)}>
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeItem(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={addManualItem} className="text-xs gap-1">
                  <Plus className="h-3 w-3" /> Adaugă manual
                </Button>
                <Button variant="ghost" size="sm" onClick={reset} className="text-xs">
                  Scanează altă notiță
                </Button>
              </div>
              <Button onClick={handleSave} disabled={selectedCount === 0 || isSaving} size="sm" className="gap-1">
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Salvează {selectedCount > 0 && `(${selectedCount})`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
