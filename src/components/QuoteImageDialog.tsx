import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ImagePlus, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Quote } from "@/lib/quotes-store";
import {
  BACKGROUNDS,
  PHOTO_BACKGROUNDS,
  recommendBackgrounds,
  downloadQuoteImage,
  loadImage,
  renderQuoteCanvas,
  type QuoteBackground,
} from "@/lib/quote-image";
import { toast } from "sonner";

export function QuoteImageDialog({ quote, trigger }: { quote: Quote; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [bg, setBg] = useState<QuoteBackground>(BACKGROUNDS[0]);
  const [uploads, setUploads] = useState<QuoteBackground[]>([]);
  const [photos, setPhotos] = useState<QuoteBackground[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setShowAll(false);
    }
  }, [open, quote.id]);

  const recommended = useMemo(() => {
    const ids = new Set(photos.map((p) => p.id));
    return recommendBackgrounds(quote.tags ?? [], 8)
      .filter((b) => ids.has(b.id))
      .slice(0, 4);
  }, [photos, quote.tags]);

  // Show only the bundled photos that actually exist.
  useEffect(() => {
    if (!open || photos.length) return;
    let cancelled = false;
    Promise.all(
      PHOTO_BACKGROUNDS.map(async (b): Promise<QuoteBackground | null> => {
        if (b.kind !== "image") return null;
        try {
          await loadImage(b.src);
          return b;
        } catch {
          return null;
        }
      }),
    ).then((found) => {
      if (!cancelled) setPhotos(found.filter((b): b is QuoteBackground => b !== null));
    });
    return () => {
      cancelled = true;
    };
  }, [open, photos.length]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    renderQuoteCanvas(quote, bg)
      .then((c) => {
        if (!cancelled) setPreview(c.toDataURL("image/png"));
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) toast.error("Could not generate image");
      });
    return () => {
      cancelled = true;
    };
  }, [open, quote, bg]);

  // Uploaded photos live only in this browser tab; release them on unmount.
  const uploadsRef = useRef<QuoteBackground[]>([]);
  uploadsRef.current = uploads;
  useEffect(
    () => () => {
      uploadsRef.current.forEach((u) => u.kind === "image" && URL.revokeObjectURL(u.src));
    },
    [],
  );

  const onUpload = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 선택할 수 있어요");
      return;
    }
    const next: QuoteBackground = {
      kind: "image",
      id: `upload-${Date.now()}`,
      label: file.name,
      src: URL.createObjectURL(file),
    };
    setUploads((u) => [...u, next]);
    setBg(next);
  };

  const download = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await downloadQuoteImage(quote, bg);
    } catch (err) {
      console.error(err);
      toast.error("Could not generate image");
    } finally {
      setBusy(false);
    }
  };

  const swatch = (b: QuoteBackground) => {
    const style =
      b.kind === "gradient"
        ? { background: `linear-gradient(135deg, ${b.stops.join(", ")})` }
        : { backgroundImage: `url(${b.src})`, backgroundSize: "cover", backgroundPosition: "center" };
    const active = bg.id === b.id;
    return (
      <button
        key={b.id}
        type="button"
        onClick={() => {
          setBg(b);
        }}
        aria-label={b.label}
        title={b.label}
        aria-pressed={active}
        className={`size-10 rounded-full ring-offset-2 ring-offset-background transition ${
          active ? "ring-2 ring-primary" : "ring-1 ring-border hover:ring-2 hover:ring-primary/50"
        }`}
        style={style}
      />
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>이미지로 저장</DialogTitle>
          <DialogDescription>명언과 저자만 담긴 이미지예요. 배경을 골라 보세요.</DialogDescription>
        </DialogHeader>

        <div className="aspect-square w-full overflow-hidden rounded-xl bg-muted">
          {preview && <img src={preview} alt="미리보기" className="size-full object-cover" />}
        </div>

        <div className="space-y-3">
          {recommended.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">이 명언에 어울리는 배경</p>
              <div className="flex flex-wrap items-center gap-2">{recommended.map(swatch)}</div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">{BACKGROUNDS.map(swatch)}</div>
          {photos.length > 0 && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 rounded-full px-3 text-xs text-muted-foreground"
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? "사진 접기" : `사진 더 찾기 (${photos.length})`}
              </Button>
              {showAll && (
                <div className="flex max-h-40 flex-wrap items-center gap-2 overflow-y-auto p-1">
                  {photos.map(swatch)}
                </div>
              )}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            {uploads.map(swatch)}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 rounded-full"
              onClick={() => fileRef.current?.click()}
              aria-label="내 사진 올리기"
              title="내 사진 올리기"
            >
              <ImagePlus />
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              onUpload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>

        <Button onClick={download} disabled={busy} className="w-full rounded-full">
          <Download /> PNG 다운로드
        </Button>
      </DialogContent>
    </Dialog>
  );
}
