export default function AuthLayout({ children }) {
  return (
    <main className="w-full max-w-[480px] h-dvh flex flex-col bg-surface relative shadow-[0_0_40px_rgba(0,0,0,0.08)] overflow-hidden">
      <div className="w-full h-full flex flex-col bg-background overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="w-full max-w-[360px] px-5 py-5 m-auto">
          {children}
        </div>
      </div>
    </main>
  );
}