import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserCheck } from "lucide-react";

const Auth = () => {
  const { signIn, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginUsuario, setLoginUsuario] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!loginUsuario.trim() || !loginPassword.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos para fazer login",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await signIn({
        usuario: loginUsuario.trim(),
        senha: loginPassword.trim(),
      });

      if (result.success) {
        toast({ title: "Login realizado!", description: "Bem-vindo ao sistema" });
        navigate("/", { replace: true }); // importante para não voltar ao /auth no histórico
      } else {
        toast({
          title: "Erro no login",
          description: result.error || "Credenciais inválidas",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erro no login",
        description: "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">Controle de Técnicos</h1>
          <p className="text-muted-foreground mt-2">Sistema de Agendamentos</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="login" className="flex items-center">
              <UserCheck className="mr-2 h-4 w-4" />
              Entrar no Sistema
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>Acesso ao Sistema</CardTitle>
                <CardDescription>Use suas credenciais do sistema Syndata para entrar</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-usuario">ID do Usuário</Label>
                    <Input
                      id="login-usuario"
                      type="text"
                      value={loginUsuario}
                      onChange={(e) => setLoginUsuario(e.target.value.replace(/\D/g, ""))} // Apenas números
                      required
                      placeholder="Digite seu ID de usuário"
                      inputMode="numeric"
                      pattern="[0-9]*"
                    />
                    <p className="text-xs text-muted-foreground">
                      Utilize o mesmo ID do sistema Syndata
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <Input
                      id="login-password"
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      placeholder="Digite sua senha"
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting || loading}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar no Sistema"
                    )}
                  </Button>
                </form>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h3 className="font-semibold text-sm mb-2">Informações de Acesso:</h3>
                  <p className="text-xs text-muted-foreground">
                    • Use seu ID de usuário do Syndata (apenas números)
                    <br />• Utilize a mesma senha do sistema Syndata
                    <br />• O sistema valida automaticamente no banco de dados
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
