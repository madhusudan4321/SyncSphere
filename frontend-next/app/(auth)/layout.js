export default function AuthLayout({ children }) {
  return (
    <div className="w-full h-full min-h-dvh flex items-center justify-center bg-background overflow-y-auto p-4">
      <div className="w-full max-w-[360px]">
        {children}
      </div>
    </div>
  );
}
