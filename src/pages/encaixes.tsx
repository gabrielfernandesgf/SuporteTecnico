import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, User } from "lucide-react";
import EditarEncaixeDialog from "@/components/EditarEncaixeDialog";
import { useToast } from "@/hooks/use-toast";

export default function EncaixesPage() {
  const [encaixes, setEncaixes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchEncaixes();
  }, []);

  const fetchEncaixes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("encaixes")
      .select("*")
      .not("status", "eq", "aceito")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao buscar encaixes:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os encaixes.",
        variant: "destructive"
      });
    } else {
      setEncaixes(data || []);
    }

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pendente":
        return "default";
      case "direcionado":
        return "warning";
      case "aceito":
        return "success";
      default:
        return "default";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pendente":
        return "Pendente";
      case "direcionado":
        return "Direcionado";
      case "aceito":
        return "Aceito";
      default:
        return status;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-background min-h-screen">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Encaixes Disponíveis</h1>
        <p className="text-muted-foreground mt-1">Gerencie os encaixes ainda não distribuídos</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Encaixes</CardTitle>
          <CardDescription>Encaixes disponíveis para distribuição</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground">Carregando encaixes...</p>
          ) : encaixes.length === 0 ? (
            <p className="text-muted-foreground">Nenhum encaixe disponível.</p>
          ) : (
            <div className="space-y-4">
              {encaixes.map((item) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 hover:bg-accent transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">#{item.id}</span>
                      <Badge variant={getStatusColor(item.status)}>
                        {getStatusText(item.status)}
                      </Badge>
                    </div>
                    <p className="text-foreground">{item.cliente}</p>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {item.data}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Técnico: {item.tecnico_id || "Não direcionado"}
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {item.endereco}
                      </div>
                    </div>
                  </div>
                  <EditarEncaixeDialog encaixe={item} onAtualizado={fetchEncaixes} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
