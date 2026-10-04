export default function Spinner({ size = 32, className = '' }) {
  return (
    <div className={`flex items-center justify-center p-4 ${className}`}>
      <div
        className="border-3 border-border border-t-accent rounded-full animate-spin-slow"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
