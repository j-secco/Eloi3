import { toast as sonnerToast } from 'sonner'

export const toast = ({ title, description, variant = 'default' }) => {
  if (variant === 'destructive') {
    sonnerToast.error(title, {
      description
    })
  } else {
    sonnerToast.success(title, {
      description
    })
  }
}

export const useToast = () => {
  return { toast }
}

