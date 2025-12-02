import React from 'react'
import { AlertDialog, AlertDialogOverlay, AlertDialogContent, AlertDialogHeader, AlertDialogBody, AlertDialogFooter, Button } from '@chakra-ui/react'

interface ExitConfirmDialogProps {
  isOpen: boolean
  leastDestructiveRef: React.RefObject<HTMLButtonElement>
  onCancel: () => void
  onConfirm: () => void
}

const ExitConfirmDialog: React.FC<ExitConfirmDialogProps> = ({ isOpen, leastDestructiveRef, onCancel, onConfirm }) => {
  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={leastDestructiveRef} onClose={onCancel}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader>¿Salir del recurso?</AlertDialogHeader>
          <AlertDialogBody>
            Estás a punto de salir. Solo se descartará el progreso del elemento actual; el avance general del recurso se conservará. ¿Deseas continuar?
          </AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={leastDestructiveRef} onClick={onCancel} variant="ghost">Cancelar</Button>
            <Button colorScheme="red" onClick={onConfirm} ml={3}>Salir y descartar este elemento</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  )
}

export default ExitConfirmDialog
