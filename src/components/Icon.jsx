import { useId } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingBasket as Basket,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  CloudSun,
  Coffee,
  Download,
  Ellipsis,
  Eye,
  EyeOff,
  Flower2,
  Gift,
  Headphones,
  Heart,
  HeartPulse,
  House,
  Info,
  Laptop,
  Leaf,
  Map,
  Menu,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Sun,
  TrainFront,
  Trash2,
  TrendingUp,
  Utensils,
  Wallet,
  Waves,
  X,
  ChartNoAxesCombined,
  ReceiptText,
  ShoppingBag,
  CircleHelp,
  FileJson,
  RotateCcw,
} from "lucide-react";

const icons = {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Basket,
  Bell,
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  CloudSun,
  Coffee,
  Download,
  Ellipsis,
  Eye,
  EyeOff,
  Flower2,
  Gift,
  Headphones,
  Heart,
  HeartPulse,
  House,
  Info,
  Laptop,
  Leaf,
  Map,
  Menu,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Sun,
  TrainFront,
  Trash2,
  TrendingUp,
  Utensils,
  Wallet,
  Waves,
  X,
  ChartNoAxesCombined,
  ReceiptText,
  ShoppingBag,
  CircleHelp,
  FileJson,
  RotateCcw,
};
const PALETTES = {
  House: ["#f45a35", "#ffae00", "#ed387e"],
  ReceiptText: ["#8755ee", "#ef42a4", "#ffae00"],
  ChartNoAxesCombined: ["#097ee6", "#00b6b0", "#ff9700"],
  Wallet: ["#ed7900", "#ffbd00", "#e74472"],
  Utensils: ["#f45d2d", "#ffae00", "#ec3f83"],
  TrainFront: ["#0875e9", "#00bac4", "#9559f1"],
  ShoppingBag: ["#9049ec", "#eb3f9e", "#ffb400"],
  Basket: ["#ed8600", "#ffbb00", "#18a56e"],
  Headphones: ["#e63899", "#9a45ef", "#ff8142"],
  HeartPulse: ["#ee3b64", "#ff7752", "#a04ce3"],
  BookOpen: ["#167bea", "#00b6b0", "#a04ef0"],
  Gift: ["#a247ed", "#f13d85", "#ffac00"],
  Sparkles: ["#9346ed", "#f344ac", "#ffb600"],
  Pencil: ["#f18100", "#ffba00", "#f04c84"],
  Plus: ["#0c9e74", "#00bbcc", "#147dee"],
  CirclePlus: ["#0aa675", "#00b7c8", "#1c7fe8"],
  Leaf: ["#069d62", "#65be00", "#ffc000"],
  Sprout: ["#00a36b", "#69bd00", "#ffb100"],
  Flower2: ["#ef3e98", "#ff9d00", "#9445e8"],
  ShieldCheck: ["#079c8c", "#197bea", "#7e4ee7"],
  Trash2: ["#ed4062", "#ff7a45", "#bf42b5"],
  Sun: ["#f39100", "#ffc000", "#f25139"],
  CloudSun: ["#ee9500", "#ffc000", "#2091e9"],
};
const FALLBACK = [
  ["#1681e7", "#00b3bf", "#8656e8"],
  ["#9b48e8", "#ee4899", "#ff9d00"],
  ["#06a07d", "#00aec4", "#4f80ed"],
  ["#ed7d00", "#f5b400", "#ef4c80"],
];
export default function Icon({
  name,
  size = 20,
  strokeWidth = 2,
  className = "",
  style,
  ...props
}) {
  const id = `icon-${useId().replaceAll(":", "")}`;
  const Component = icons[name] ?? Leaf;
  const colors =
    PALETTES[name] ??
    FALLBACK[
      [...(name ?? "Leaf")].reduce((sum, char) => sum + char.charCodeAt(0), 0) %
        FALLBACK.length
    ];
  return (
    <Component
      size={size}
      strokeWidth={strokeWidth}
      stroke={`url(#${id})`}
      className={`color-icon ${className}`}
      style={{
        "--icon-accent": colors[2],
        "--icon-fill": `${colors[0]}16`,
        ...style,
      }}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="58%" stopColor={colors[1]} />
          <stop offset="100%" stopColor={colors[2]} />
        </linearGradient>
      </defs>
    </Component>
  );
}
