export default function InviteNotFound() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
      <p className="text-5xl mb-4">💌</p>
      <h1 className="[font-family:var(--font-display)] text-3xl text-royal-700 mb-2">
        Convite não encontrado
      </h1>
      <p className="text-royal-800/60 max-w-sm">
        Este link de convite não é válido. Confira se você copiou o link completo da mensagem que
        recebeu.
      </p>
    </main>
  );
}
