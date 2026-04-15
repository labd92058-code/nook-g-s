import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const Avatar = ({ name, size = 'md', className }: AvatarProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const getColor = (name: string) => {
    const colors = ['#7c3aed', '#2563eb', '#059669', '#d97706', '#dc2626', '#db2777']
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return colors[hash % colors.length]
  }

  const color = getColor(name)
  const initials = getInitials(name)

  const sizes = {
    sm: 'h-8 w-8 text-[10px]',
    md: 'h-10 w-10 text-xs',
    lg: 'h-16 w-16 text-lg',
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full font-bold border',
        sizes[size],
        className
      )}
      style={{
        backgroundColor: `${color}26`, // 15% opacity
        borderColor: `${color}4d`, // 30% opacity
        color: color,
      }}
    >
      {initials}
    </div>
  )
}
