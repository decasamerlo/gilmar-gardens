import { supabase } from '@/lib/supabase';

/** Quem acessa o aplicativo: o proprietário ou Heloíse. */
export class Usuario {
  constructor(
    readonly id: string,
    readonly nome: string,
    readonly email: string,
  ) {}

  /** Entra com e-mail e senha; devolve false se o Supabase recusar e lança erro se não houver internet. */
  static async entrar(email: string, senha: string): Promise<boolean> {
    if (!supabase) return true;
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    if (error && (error.name === 'AuthRetryableFetchError' || !error.status)) {
      throw new Error('Sem conexão com o servidor');
    }
    return !error;
  }

  static async sair(): Promise<void> {
    await supabase?.auth.signOut();
  }
}
