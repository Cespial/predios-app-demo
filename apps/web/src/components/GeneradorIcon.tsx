import type { GeneradorTipo } from "@/types";
import type { LucideIcon } from "lucide-react";
import {
  Trophy,
  Heart,
  Stethoscope,
  GraduationCap,
  Train,
  ShoppingBag,
  Landmark,
} from "lucide-react";

interface GeneradorIconProps {
  tipo: GeneradorTipo;
  size?: number;
}

const iconConfig: Record<GeneradorTipo, { icon: LucideIcon; color: string }> = {
  estadio: { icon: Trophy, color: "text-amber-400" },
  hospital: { icon: Heart, color: "text-red-400" },
  clinica: { icon: Stethoscope, color: "text-rose-300" },
  universidad: { icon: GraduationCap, color: "text-blue-400" },
  metro: { icon: Train, color: "text-cyan-400" },
  centro_comercial: { icon: ShoppingBag, color: "text-purple-400" },
  coliseo: { icon: Landmark, color: "text-orange-400" },
};

export function GeneradorIcon({ tipo, size = 18 }: GeneradorIconProps) {
  const config = iconConfig[tipo];
  if (!config) return null;

  const Icon = config.icon;
  return <Icon size={size} className={config.color} />;
}
