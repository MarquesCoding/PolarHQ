"use client"

/// The Orbit app shown as a "MacBook screen" — a rounded screen frame containing the real app
/// screenshot (public/screen.png). Cut at the bezel, no keyboard.
const MacWindow = () => (
  <div className="overflow-hidden rounded-[18px] border border-white/10 bg-[#0e0e11] p-1.5 shadow-2xl ring-1 ring-white/10">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src="/screen.png"
      alt="The Orbit Photos app"
      className="block w-full rounded-[12px]"
      draggable={false}
    />
  </div>
)

export default MacWindow
