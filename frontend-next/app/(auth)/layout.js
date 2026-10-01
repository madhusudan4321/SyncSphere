export default function AuthLayout({ children }) {
  return (
    <div className="w-full h-full min-h-dvh flex items-center justify-center bg-background overflow-y-auto">
      <div className="w-full max-w-[360px] px-5 py-5">
        {children}
      </div>
    </div>
  );
}
