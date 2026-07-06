import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Eye, EyeOff, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useCategories,
  useAddCategory,
  useRenameCategory,
  useDeleteCategory,
  useToggleHideCategory,
  type Category,
} from "@/hooks/useCategories";

const Categories = () => {
  const navigate = useNavigate();
  const { data: categories = [], isLoading } = useCategories();
  const addMut = useAddCategory();
  const renameMut = useRenameCategory();
  const deleteMut = useDeleteCategory();
  const hideMut = useToggleHideCategory();

  const [addOpen, setAddOpen] = useState(false);
  const [addDraft, setAddDraft] = useState("");

  const [renameTarget, setRenameTarget] = useState<Category | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const handleAdd = async () => {
    const name = addDraft.trim();
    if (!name) {
      toast.error("Unesi ime kategorije.");
      return;
    }
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Kategorija s tim imenom već postoji.");
      return;
    }
    try {
      await addMut.mutateAsync(name);
      toast.success("Kategorija dodana.");
      setAddDraft("");
      setAddOpen(false);
    } catch {
      toast.error("Dodavanje nije uspjelo.");
    }
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    const name = renameDraft.trim();
    if (!name) {
      toast.error("Unesi ime kategorije.");
      return;
    }
    try {
      await renameMut.mutateAsync({ id: renameTarget.id, name });
      toast.success("Kategorija preimenovana.");
      setRenameTarget(null);
    } catch {
      toast.error("Preimenovanje nije uspjelo.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast.success("Kategorija obrisana.");
      setDeleteTarget(null);
    } catch {
      toast.error("Brisanje nije uspjelo.");
    }
  };

  const toggleHide = async (cat: Category) => {
    try {
      await hideMut.mutateAsync({ id: cat.id, hidden: !cat.is_hidden });
    } catch {
      toast.error("Promjena nije uspjela.");
    }
  };

  const defaults = categories.filter((c) => c.is_default);
  const custom = categories.filter((c) => !c.is_default);

  return (
    <section className="flex-1 flex flex-col px-5 pt-10 pb-6">
      <header className="mb-6 flex items-center gap-3">
        <button
          type="button"
          aria-label="Natrag"
          onClick={() => navigate("/profil")}
          className="h-9 w-9 rounded-full flex items-center justify-center text-foreground hover:bg-secondary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold text-foreground">Kategorije</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Uredi, dodaj ili sakrij kategorije.
          </p>
        </div>
      </header>

      <Button
        onClick={() => {
          setAddDraft("");
          setAddOpen(true);
        }}
        className="mb-6 h-12 rounded-full font-semibold"
      >
        <Plus className="h-4 w-4" />
        Dodaj kategoriju
      </Button>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {defaults.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">
                Zadane
              </h2>
              <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border overflow-hidden">
                {defaults.map((c) => (
                  <CategoryRow
                    key={c.id}
                    cat={c}
                    onRename={() => {
                      setRenameTarget(c);
                      setRenameDraft(c.name);
                    }}
                    onToggleHide={() => toggleHide(c)}
                  />
                ))}
              </ul>
            </div>
          )}

          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 px-1">
              Tvoje kategorije
            </h2>
            {custom.length === 0 ? (
              <p className="px-1 text-sm text-muted-foreground">
                Još nemaš vlastitih kategorija.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-2xl border border-border overflow-hidden">
                {custom.map((c) => (
                  <CategoryRow
                    key={c.id}
                    cat={c}
                    onRename={() => {
                      setRenameTarget(c);
                      setRenameDraft(c.name);
                    }}
                    onDelete={() => setDeleteTarget(c)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova kategorija</DialogTitle>
            <DialogDescription>
              Unesi ime kategorije. Možeš dodati i emoji na početak.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Label htmlFor="cat-name">Ime</Label>
            <Input
              id="cat-name"
              value={addDraft}
              onChange={(e) => setAddDraft(e.target.value)}
              placeholder="npr. 🐾 Ljubimci"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => setAddOpen(false)}
              disabled={addMut.isPending}
            >
              Odustani
            </Button>
            <Button onClick={handleAdd} disabled={addMut.isPending}>
              {addMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Dodaj
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename dialog */}
      <Dialog
        open={!!renameTarget}
        onOpenChange={(o) => !o && setRenameTarget(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Preimenuj kategoriju</DialogTitle>
            <DialogDescription>
              Promijeni ime kategorije „{renameTarget?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 pt-2">
            <Label htmlFor="cat-rename">Ime</Label>
            <Input
              id="cat-rename"
              value={renameDraft}
              onChange={(e) => setRenameDraft(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="ghost"
              onClick={() => setRenameTarget(null)}
              disabled={renameMut.isPending}
            >
              Odustani
            </Button>
            <Button onClick={handleRename} disabled={renameMut.isPending}>
              {renameMut.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Spremi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obriši kategoriju?</AlertDialogTitle>
            <AlertDialogDescription>
              Kategorija „{deleteTarget?.name}" bit će trajno obrisana. Postojeće
              transakcije zadržat će ime kategorije.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Odustani</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Obriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

const CategoryRow = ({
  cat,
  onRename,
  onDelete,
  onToggleHide,
}: {
  cat: Category;
  onRename: () => void;
  onDelete?: () => void;
  onToggleHide?: () => void;
}) => {
  return (
    <li
      className={`flex items-center gap-3 bg-background px-4 py-3 ${
        cat.is_hidden ? "opacity-60" : ""
      }`}
    >
      <span className="flex-1 min-w-0 text-sm font-medium text-foreground truncate">
        {cat.name}
        {cat.is_hidden && (
          <span className="ml-2 text-xs text-muted-foreground font-normal">
            (sakriveno)
          </span>
        )}
      </span>
      <button
        type="button"
        aria-label="Preimenuj"
        onClick={onRename}
        className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground"
      >
        <Pencil className="h-4 w-4" />
      </button>
      {onToggleHide && (
        <button
          type="button"
          aria-label={cat.is_hidden ? "Prikaži" : "Sakrij"}
          onClick={onToggleHide}
          className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          {cat.is_hidden ? (
            <Eye className="h-4 w-4" />
          ) : (
            <EyeOff className="h-4 w-4" />
          )}
        </button>
      )}
      {onDelete && (
        <button
          type="button"
          aria-label="Obriši"
          onClick={onDelete}
          className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </li>
  );
};

export default Categories;