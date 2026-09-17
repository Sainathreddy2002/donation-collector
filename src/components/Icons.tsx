import type { ReactNode } from 'react'

type IconProps = {
  size?: number
  className?: string
}

function Svg({ size = 18, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

export function IconEdit({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </Svg>
  )
}

export function IconTrash({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </Svg>
  )
}

export function IconHistory({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 2" />
    </Svg>
  )
}

export function IconFilter({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M4 5h16l-6 7v5l-4 2v-7Z" />
    </Svg>
  )
}

export function IconSearch({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </Svg>
  )
}

export function IconPlus({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Svg>
  )
}

export function IconUsers({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a3 3 0 0 1 0 5.74" />
    </Svg>
  )
}

export function IconHome({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M3 11.5 12 4l9 7.5" />
      <path d="M6 10.5V20h12v-9.5" />
    </Svg>
  )
}

export function IconUser({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Svg>
  )
}

export function IconLink({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5.93" />
      <path d="M14 11a5 5 0 0 0-7.07 0L5.52 12.4a5 5 0 0 0 7.07 7.07L14 18.07" />
    </Svg>
  )
}

export function IconCopy({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </Svg>
  )
}

export function IconCheck({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M20 6 9 17l-5-5" />
    </Svg>
  )
}

export function IconCalendar({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M3 11h18" />
    </Svg>
  )
}

export function IconMapPin({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </Svg>
  )
}

export function IconRupee({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M6 5h12" />
      <path d="M6 10h12" />
      <path d="M6 5c4 0 7 2.5 7 5.5S10 16 6 16" />
      <path d="M10 16l7 4" />
    </Svg>
  )
}

export function IconNote({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8Z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </Svg>
  )
}

export function IconLogout({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M10 17H5V7h5" />
      <path d="M14 12H5" />
      <path d="M16 8l4 4-4 4" />
    </Svg>
  )
}

export function IconBack({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M15 18l-6-6 6-6" />
    </Svg>
  )
}

export function IconPhone({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M22 16.9v2.2a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 3.4 2 2 0 0 1 4.1 1.2h2.2a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.6a2 2 0 0 1-.5 2.1L7.9 8.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.8.3 1.7.5 2.6.6a2 2 0 0 1 1.7 2.1Z" />
    </Svg>
  )
}

export function IconKey({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <circle cx="8" cy="15" r="4" />
      <path d="M11.5 12.5 20 4" />
      <path d="M16 4h4v4" />
    </Svg>
  )
}

export function IconSave({ size, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
      <path d="M17 21v-8H7v8" />
      <path d="M7 3v5h8" />
    </Svg>
  )
}

/** Brand mark — simple ₹ */
export function IconLogo({ size = 22, className }: IconProps) {
  return (
    <Svg size={size} className={className}>
      <path d="M7 6h10M7 10.5h10" />
      <path d="M7 6c4.5 0 7 2.4 7 5.8S11.5 17.5 7 17.5" />
      <path d="M11 12.5 17 19" />
    </Svg>
  )
}
