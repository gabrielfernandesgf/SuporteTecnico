import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2 } from "lucide-react";

interface NovoAgendamentoDialogProps {
  onAgendamentoCriado: () => void;
}

const NovoAgendamentoDialog = ({ onAgendamentoCriado }: NovoAgendamentoDialogProps) => {
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    id: '',
    cliente: '',
    endereco: '',
    tipo: '',
    tecnico_id: '',
    horario: '',
    data: new Date().toLocaleDateString('en-CA'),
    observacoes: ''
  });
  
  const [tecnicos, setTecnicos] = useState<any[]>([]);

  const tiposAtendimento = [
    'Treinamento',
    'Cancelamento', 
    'Verificação de Sistema',
    'Manutenção',
    'Instalação',
    'Suporte Técnico'
  ];

  const fetchTecnicos = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name')
        .eq('role', 'tecnico');
      
      if (error) throw error;
      setTecnicos(data || []);
    } catch (error) {
      console.error('Erro ao buscar técnicos:', error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      fetchTecnicos();
      // Gerar ID automático
      const novoId = `AG${Date.now().toString().slice(-6)}`;
      setFormData(prev => ({ ...prev, id: novoId }));
    } else {
      // Reset form
      setFormData({
        id: '',
        cliente: '',
        endereco: '',
        tipo: '',
        tecnico_id: '',
        horario: '',
        data: new Date().toLocaleDateString('en-CA'),
        observacoes: ''
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente || !formData.endereco || !formData.tipo || !formData.tecnico_id || !formData.horario) {
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
        .from('agendamentos')
        .insert({
          id: formData.id,
          cliente: formData.cliente,
          endereco: formData.endereco,
          tipo: formData.tipo,
          tecnico_id: formData.tecnico_id,
          horario: formData.horario,
          data: new Date(formData.data + 'T00:00:00').toISOString().split('T')[0],
          observacoes: formData.observacoes,
          status: 'agendado'
        });
      
      if (error) throw error;
      
      toast({
        title: "Agendamento criado!",
        description: `Agendamento ${formData.id} criado com sucesso.`,
      });
      
      setOpen(false);
      onAgendamentoCriado();
    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o agendamento",
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
        <Button className="bg-primary hover:bg-primary-hover">
          <Plus className="mr-2 h-4 w-4" />
          Novo Agendamento
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Criar Novo Agendamento</DialogTitle>
          <DialogDescription>
            Preencha os dados para criar um novo agendamento
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="id">Número do Agendamento</Label>
              <Input
                id="id"
                value={formData.id}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={formData.data}
                onChange={(e) => setFormData(prev => ({ ...prev, data: e.target.value }))}
                required
              />
            </div>
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
              <Label htmlFor="horario">Horário *</Label>
              <Input
                id="horario"
                type="time"
                value={formData.horario}
                onChange={(e) => setFormData(prev => ({ ...prev, horario: e.target.value }))}
                required
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="tecnico">Técnico Responsável *</Label>
            <Select onValueChange={(value) => setFormData(prev => ({ ...prev, tecnico_id: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o técnico" />
              </SelectTrigger>
              <SelectContent>
                {tecnicos.map(tecnico => (
                  <SelectItem key={tecnico.user_id} value={tecnico.user_id}>
                    {tecnico.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              placeholder="Observações sobre o atendimento..."
              rows={3}
            />
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
                'Criar Agendamento'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NovoAgendamentoDialog;