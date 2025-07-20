import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2 } from "lucide-react";

interface NovoEncaixeDialogProps {
  onEncaixeCriado: () => void;
}

const NovoEncaixeDialog = ({ onEncaixeCriado }: NovoEncaixeDialogProps) => {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    cliente: '',
    endereco: '',
    tipo: '',
    urgencia: 'Baixa',
    observacoes: ''
  });

  const tiposAtendimento = [
    'Treinamento',
    'Cancelamento', 
    'Verificação de Sistema',
    'Manutenção',
    'Instalação',
    'Suporte Técnico'
  ];

  const niveisUrgencia = ['Baixa', 'Média', 'Alta'];

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Gerar ID automático
      const novoId = `ENC${Date.now().toString().slice(-6)}`;
      setFormData(prev => ({ ...prev, id: novoId }));
    } else {
      // Reset form
      setFormData({
        id: '',
        cliente: '',
        endereco: '',
        tipo: '',
        urgencia: 'Baixa',
        observacoes: ''
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente || !formData.endereco || !formData.tipo) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('encaixes')
        .insert({
          id: formData.id,
          cliente: formData.cliente,
          endereco: formData.endereco,
          tipo: formData.tipo,
          urgencia: formData.urgencia,
          observacoes: formData.observacoes,
          status: 'disponivel'
        });
      
      if (error) throw error;
      
      toast({
        title: "Encaixe criado!",
        description: `Encaixe ${formData.id} criado com sucesso.`,
      });
      
      setOpen(false);
      onEncaixeCriado();
    } catch (error) {
      console.error('Erro ao criar encaixe:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o encaixe",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (userProfile?.role !== 'secretaria') {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
          <Plus className="mr-2 h-4 w-4" />
          Novo Encaixe
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Encaixe</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um novo encaixe urgente
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="id">Número do Encaixe</Label>
            <Input
              id="id"
              value={formData.id}
              onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
              placeholder="Ex: Agendamento 123456"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cliente">Nome do Cliente *</Label>
            <Input
              id="cliente"
              value={formData.cliente}
              onChange={(e) => setFormData(prev => ({ ...prev, cliente: e.target.value }))}
              placeholder="Ex: Empresa ABC Ltda"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço *</Label>
            <Input
              id="endereco"
              value={formData.endereco}
              onChange={(e) => setFormData(prev => ({ ...prev, endereco: e.target.value }))}
              placeholder="Ex: Rua das Flores, 123 - Centro"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Solicitação *</Label>
              <Select onValueChange={(value) => setFormData(prev => ({ ...prev, tipo: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposAtendimento.map(tipo => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="urgencia">Urgência</Label>
              <Select value={formData.urgencia} onValueChange={(value) => setFormData(prev => ({ ...prev, urgencia: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {niveisUrgencia.map(urgencia => (
                    <SelectItem key={urgencia} value={urgencia}>{urgencia}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="observacoes">Observações</label>
              <textarea
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                placeholder="Descreva o que deve ser feito no encaixe"
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm shadow-sm"
                />
            </div>

          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                'Criar Encaixe'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovoEncaixeDialog;