export default function AuthLayout({ children }) {
  return (
    <div className="w-full min-h-dvh flex items-center justify-center bg-gradient-to-br from-slate-900 via-zinc-900 to-neutral-950 text-text p-4 md:p-8 overflow-y-auto">
      <div className="w-full max-w-5xl bg-surface/95 backdrop-blur-xl border border-border/80 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[620px]">
        {/* Left Side Feature Showcase (Desktop/Laptop) */}
        <div className="hidden md:flex md:col-span-6 bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-10 flex-col justify-between relative overflow-hidden text-white">
          {/* Ambient Glow Orbs */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-white/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-pink-400/30 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Header */}
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase mb-6 border border-white/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              SyncSphere Web v2.0
            </div>
            <h1 className="font-[family-name:var(--font-dancing)] text-6xl font-bold tracking-wide drop-shadow-md">
              SyncSphere
            </h1>
            <p className="text-white/90 text-lg font-medium mt-2 max-w-sm leading-relaxed">
              Connect, share moments, and video chat in real-time with people around the world.
            </p>
          </div>

          {/* Middle Interactive Showcase Card */}
          <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 my-6 space-y-3.5 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-base">
                ⚡
              </div>
              <div>
                <p className="text-sm font-bold">HD Video & Voice Calling</p>
                <p className="text-xs text-white/75">Crystal clear WebRTC connection built-in</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-base">
                💬
              </div>
              <div>
                <p className="text-sm font-bold">Instant Messaging & Media</p>
                <p className="text-xs text-white/75">Send voice notes, media, stories and reaction emojis</p>
              </div>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="relative z-10 text-xs text-white/70">
            &copy; {new Date().getFullYear()} SyncSphere Platform. All rights reserved.
          </div>
        </div>

        {/* Right Side Form Content */}
        <div className="col-span-1 md:col-span-6 p-6 sm:p-10 flex flex-col justify-center bg-surface">
          <div className="w-full max-w-md mx-auto">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
