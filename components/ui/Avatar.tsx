const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-16 w-16 text-xl",
};

export function Avatar({
  initials,
  size = "md",
}: {
  initials: string;
  size?: keyof typeof SIZES;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-asphalt-700 font-[family-name:var(--font-display)] font-bold text-signal-amber ${SIZES[size]}`}
    >
      {initials}
    </div>
  );
}
