import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Boxes, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, queryKeys } from "@/lib/api";
import type { Category } from "@/lib/types";

/** Settings → Prop Categories. Categories created here feed the Add Prop form and catalog filters. */
export function CategoryManager() {
  const queryClient = useQueryClient();
  const categories = useQuery({ queryKey: queryKeys.categories, queryFn: api.getCategories });
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.categories });
    void queryClient.invalidateQueries({ queryKey: queryKeys.props });
  };

  const create = useMutation({
    mutationFn: () => api.saveCategory({ name, icon: icon || "Boxes" }),
    onSuccess: (c) => {
      toast.success("Category created", { description: `${c.name} · ${c.slug}` });
      setName("");
      setIcon("");
      refresh();
    },
    onError: (e: Error) => toast.error("Could not create category", { description: e.message }),
  });

  const update = useMutation({
    mutationFn: (id: number) => api.updateCategory(id, { name: editName, icon: editIcon }),
    onSuccess: () => {
      toast.success("Category updated");
      setEditId(null);
      refresh();
    },
    onError: (e: Error) => toast.error("Could not update category", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteCategory(id),
    onSuccess: () => {
      toast.success("Category deleted");
      refresh();
    },
    onError: (e: Error) => toast.error("Could not delete category", { description: e.message }),
  });

  const startEdit = (c: Category) => {
    setEditId(c.id);
    setEditName(c.name);
    setEditIcon(c.icon);
  };

  return (
    <section className="mt-6 print:hidden" aria-label="Prop categories">
      <header className="mb-4">
        <h2 className="font-display text-2xl tracking-wide text-gradient-gold">Prop Categories</h2>
        <p className="text-xs text-muted-foreground">
          Create the cinema prop categories used when adding props and filtering the public catalog.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <form
          className="space-y-3 rounded-xl border border-primary/25 bg-card p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate();
          }}
        >
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
            New Category
          </p>
          <div className="space-y-2">
            <Label>Category Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Period Weapons"
            />
          </div>
          <div className="space-y-2">
            <Label>Icon (optional)</Label>
            <Input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="Boxes / Sword / Car"
            />
            <p className="text-[11px] text-muted-foreground">Lucide icon name. Defaults to Boxes.</p>
          </div>
          <Button type="submit" disabled={!name.trim() || create.isPending} className="w-full">
            <Plus className="size-4" /> {create.isPending ? "Creating…" : "Create Category"}
          </Button>
        </form>

        <div className="overflow-hidden rounded-xl border border-primary/20 bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Icon</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(categories.data ?? []).map((c) => (
                <tr key={c.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-2">
                    {editId === c.id ? (
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    ) : (
                      <span className="flex items-center gap-2 font-medium">
                        <Boxes className="size-4 text-primary" /> {c.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">{c.slug}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {editId === c.id ? (
                      <Input value={editIcon} onChange={(e) => setEditIcon(e.target.value)} />
                    ) : (
                      c.icon
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-2">
                      {editId === c.id ? (
                        <>
                          <Button
                            size="sm"
                            disabled={update.isPending}
                            onClick={() => update.mutate(c.id)}
                          >
                            <Check className="size-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditId(null)}>
                            <X className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" onClick={() => startEdit(c)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={remove.isPending}
                            onClick={() => {
                              if (confirm(`Delete category "${c.name}"?`)) remove.mutate(c.id);
                            }}
                          >
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!categories.isLoading && (categories.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No categories yet — create the first one to tag props.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
