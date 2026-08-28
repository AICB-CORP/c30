export default function GateLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 py-8">
      <div className="retro-pink-box w-full max-w-md sparkle-cursor">{children}</div>
    </div>
  );
}
