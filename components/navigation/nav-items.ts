import {
  LayoutDashboard,
  ArrowLeftRight,
  WalletCards,
  CalendarCheck2,
  History,
  Settings,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  {
    label: 'Inicio',
    href: '/dashboard',
    icon: LayoutDashboard,
    exact: false,
  },
  {
    label: 'Actividad',
    href: '/actividad',
    icon: ArrowLeftRight,
    exact: false,
  },
  {
    label: 'Mis Cuentas',
    href: '/cuentas',
    icon: WalletCards,
    exact: false,
  },
  {
    label: 'Mi Mes',
    href: '/mi-mes',
    icon: CalendarCheck2,
    exact: false,
  },
  {
    label: 'Historial',
    href: '/historial',
    icon: History,
    exact: false,
  },
];

export const SETTINGS_NAV_ITEM: NavItem = {
  label: 'Configuración',
  href: '/configuracion',
  icon: Settings,
  exact: false,
};
