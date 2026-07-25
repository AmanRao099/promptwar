import {
  HeartPulse,
  Siren,
  Quote,
  Wind,
  Volume2,
  Square,
  MessageCircle,
  Mic,
  PersonStanding,
  Ban,
  CloudOff,
  RefreshCw,
  LifeBuoy,
  LayoutDashboard,
  ArrowRight,
  Sparkles,
  Loader,
  TriangleAlert,
  Headset,
  X,
  ShieldCheck,
  Zap,
  Cross,
  Lightbulb,
  Check,
  HelpCircle,
  type LucideIcon,
} from "lucide-react";

// Maps the design's Material-Symbol names to bundled lucide icons. Bundled =
// no external CDN/font, so it stays within the app's strict CSP.
const MAP: Record<string, LucideIcon> = {
  healing: HeartPulse,
  emergency_home: Siren,
  emergency: TriangleAlert,
  format_quote: Quote,
  self_improvement: Wind,
  spa: Sparkles,
  volume_up: Volume2,
  stop: Square,
  chat_bubble: MessageCircle,
  record_voice_over: Mic,
  accessibility_new: PersonStanding,
  do_not_disturb_on: Ban,
  cloud_off: CloudOff,
  refresh: RefreshCw,
  sos: LifeBuoy,
  dashboard_customize: LayoutDashboard,
  arrow_forward: ArrowRight,
  hourglass_top: Loader,
  support_agent: Headset,
  close: X,
  verified_user: ShieldCheck,
  bolt: Zap,
  warning: TriangleAlert,
  medical_services: Cross,
  lightbulb: Lightbulb,
  check: Check,
};

// `fill` kept for API compatibility (Material used it); lucide is stroke-based
// so it's accepted and ignored. Size follows font-size via size="1em", so the
// existing text-* classes at call sites control both color and scale.
export function Icon({
  name,
  className = "",
  fill: _fill,
  label,
}: {
  name: string;
  className?: string;
  fill?: boolean;
  label?: string;
}) {
  const Glyph = MAP[name] ?? HelpCircle;
  return (
    <Glyph
      className={className}
      size="1em"
      aria-hidden={label ? undefined : true}
      role={label ? "img" : undefined}
      aria-label={label}
    />
  );
}
