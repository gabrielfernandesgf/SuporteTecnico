import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Loader2 } from "lucide-react";

interface EditarEncaixeDialogProps {
  encaixe: any;
  onAtualizado: () => void;
}

const EditarEncaixeDialog = ({ encaixe, onAtualizado }: EditarEncaixeDialogProps) => {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [tecnicos, setTecnicos] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    id: encaixe.id,
    cliente: encaixe.cliente,
    endereco: encaixe.endereco,
    tipo: encaixe.tipo,
    urgencia: encaixe.urgencia,
    observacoes: encaixe.observacoes || '',
    tecnico_id: encaixe.tecnico_id || '',
  });

  useEffect(() => {
    const carregarTecnicos = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, name")
        .eq("role", "tecnico");

      if (error) {
        console.error("Erro ao carregar técnicos:", error);
      } else {
        setTecnicos(data);
      }
    };

    carregarTecnicos();
  }, []);

  const tiposAtendimento = [
    "Treinamento",
    "Cancelamento",
    "Verificação de Sistema",
    "Manutenção",
    "Instalação",
    "Suporte Técnico",
  ];

  const niveisUrgencia = ["Baixa", "Média", "Alta"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cliente || !formData.endereco || !formData.tipo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("encaixes")
        .update({
          cliente: formData.cliente,
          endereco: formData.endereco,
          tipo: formData.tipo,
          urgencia: formData.urgencia,
          observacoes: formData.observacoes,
          tecnico_id: formData.tecnico_id || null, // permite deixar nulo
        })
        .eq("id", formData.id);

      if (error) throw error;

      toast({
        title: "Encaixe atualizado!",
        description: `Encaixe ${formData.id} atualizado com sucesso.`,
      });

      setOpen(false);
      onAtualizado();
    } catch (error) {
      console.error("Erro ao atualizar encaixe:", error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o encaixe",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (userProfile?.role !== "secretaria") return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className="text-sm">
          <Pencil className="w-4 h-4 mr-2" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Encaixe</DialogTitle>
          <DialogDescription>Atualize os dados do encaixe selecionado</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="id">Número do Encaixe</Label>
            <Input id="id" value={formData.id} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cliente">Nome do Cliente *</Label>
            <Input
              id="cliente"
              value={formData.cliente}
              onChange={(e) => setFormData((prev) => ({ ...prev, cliente: e.target.value }))}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço *</Label>
            <Input
              id="endereco"
              value={formData.endereco}
              onChange={(e) => setFormData((prev) => ({ ...prev, endereco: e.target.value }))}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Solicitação *</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, tipo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposAtendimento.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="urgencia">Urgência</Label>
              <Select
                value={formData.urgencia}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, urgencia: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {niveisUrgencia.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="tecnico_id">Técnico Responsável (opcional)</Label>
              <Select
                value={formData.tecnico_id}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, tecnico_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o técnico" />
                </SelectTrigger>
                <SelectContent>
                  {tecnicos.map((t) => (
                    <SelectItem key={t.user_id} value={t.user_id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="observacoes">Observações</Label>
              <textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, observacoes: e.target.value }))
                }
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm shadow-sm"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditarEncaixeDialog;