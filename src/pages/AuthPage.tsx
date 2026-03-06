import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { BookOpen } from 'lucide-react';

const AuthPage = () => {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        await signUp(email, password);
        toast.success('Compte créé ! Vérifiez votre email pour confirmer.');
      } else {
        await signIn(email, password);
        toast.success('Connexion réussie !');
      }
    } catch (error: any) {
      toast.error(error.message || 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary mb-4">
            <BookOpen className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">SysCompta</h1>
          <p className="text-muted-foreground mt-1">Comptabilité SYSCOHADA — Sénégal</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isSignUp ? 'Créer un compte' : 'Se connecter'}</CardTitle>
            <CardDescription>
              {isSignUp ? 'Entrez vos informations pour créer un compte' : 'Entrez vos identifiants pour accéder à votre espace'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Chargement...' : isSignUp ? 'Créer le compte' : 'Se connecter'}
              </Button>
            </form>
            <div className="mt-4 text-center">
              <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-primary hover:underline">
                {isSignUp ? 'Déjà un compte ? Se connecter' : "Pas de compte ? S'inscrire"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
