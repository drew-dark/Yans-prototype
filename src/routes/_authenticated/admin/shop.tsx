import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { toast } from "sonner";
import { Trash2, Pencil, Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/shop")({
  component: ShopAdmin,
});

type Product = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  price_cents: number;
  currency: string;
  stock: number | null;
  buy_url: string | null;
  sort_order: number;
  published: boolean;
};

const empty = { title: "", slug: "", description: "", image_url: "", price: "0", currency: "USD", stock: "", buy_url: "", sort_order: 0, published: false };

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function ShopAdmin() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin", "shop_products"],
    queryFn: async () => {
      const { data, error } = await supabase.from("shop_products").select("*").order("sort_order");
      if (error) throw error;
      return data as Product[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);

  function startNew() { setEditing(null); setForm({ ...empty, sort_order: items.length }); setOpen(true); }
  function startEdit(p: Product) {
    setEditing(p);
    setForm({
      title: p.title, slug: p.slug, description: p.description ?? "",
      image_url: p.image_url ?? "", price: (p.price_cents / 100).toString(),
      currency: p.currency, stock: p.stock?.toString() ?? "",
      buy_url: p.buy_url ?? "", sort_order: p.sort_order, published: p.published,
    });
    setOpen(true);
  }

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title) throw new Error("Title required");
      const slug = form.slug || slugify(form.title);
      const payload = {
        title: form.title, slug, description: form.description,
        image_url: form.image_url || null,
        price_cents: Math.round(parseFloat(form.price || "0") * 100),
        currency: form.currency, stock: form.stock === "" ? null : parseInt(form.stock),
        buy_url: form.buy_url || null, sort_order: form.sort_order, published: form.published,
      };
      if (editing) {
        const { error } = await supabase.from("shop_products").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("shop_products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "shop_products"] }); setOpen(false); toast.success("Saved"); },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("shop_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin", "shop_products"] }); toast.success("Deleted"); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl uppercase">Shop</h1>
          <p className="text-sm text-white/50">Products with external buy links.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={startNew}><Plus className="mr-1 h-4 w-4" />New product</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto bg-neutral-950 text-white border-neutral-800 sm:max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? "Edit product" : "New product"}</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-neutral-900 border-neutral-800" />
              </div>
              <div className="space-y-2">
                <Label>Slug (auto if blank)</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="bg-neutral-900 border-neutral-800" />
              </div>
              <ImageUpload folder="shop" label="Product image" value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-neutral-900 border-neutral-800" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2"><Label>Price</Label><Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="bg-neutral-900 border-neutral-800" /></div>
                <div className="space-y-2"><Label>Currency</Label><Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="bg-neutral-900 border-neutral-800" /></div>
                <div className="space-y-2"><Label>Stock</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className="bg-neutral-900 border-neutral-800" /></div>
              </div>
              <div className="space-y-2">
                <Label>Buy URL</Label>
                <Input value={form.buy_url} onChange={(e) => setForm({ ...form, buy_url: e.target.value })} placeholder="https://…" className="bg-neutral-900 border-neutral-800" />
              </div>
              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} className="bg-neutral-900 border-neutral-800" />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
                <Label>Published</Label>
              </div>
            </div>
            <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? <p className="text-white/40">Loading…</p> : (
        <div className="space-y-2">
          {items.map((p) => (
            <div key={p.id} className="flex items-center gap-4 rounded border border-white/10 bg-neutral-900 p-3">
              {p.image_url && <img src={p.image_url} alt="" className="h-16 w-16 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <p className="truncate font-mono text-sm">{p.title}</p>
                <p className="text-xs text-white/40">{p.currency} {(p.price_cents / 100).toFixed(2)} · stock: {p.stock ?? "∞"}</p>
              </div>
              <span className={`rounded px-2 py-0.5 text-[10px] uppercase ${p.published ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-white/50"}`}>{p.published ? "Live" : "Draft"}</span>
              <Button size="sm" variant="outline" onClick={() => startEdit(p)}><Pencil className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => confirm("Delete?") && del.mutate(p.id)}><Trash2 className="h-3 w-3 text-red-400" /></Button>
            </div>
          ))}
          {items.length === 0 && <p className="text-white/40">No products yet.</p>}
        </div>
      )}
    </div>
  );
}
