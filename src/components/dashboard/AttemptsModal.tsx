import React from 'react'
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody, ModalFooter, HStack, Spinner, Text, Table, Thead, Tbody, Tr, Th, Td, Alert, AlertIcon, Button } from '@chakra-ui/react'
import type { EducationalResource } from '../../services/resources'

interface AttemptRow {
  attempt_number: number
  final_score: number | null
}

interface AttemptsModalProps {
  isOpen: boolean
  onClose: () => void
  reviewResource: EducationalResource | null
  loadingAttempts: boolean
  attemptsForReview: AttemptRow[]
  onRetake: (resource: EducationalResource) => void
}

const AttemptsModal: React.FC<AttemptsModalProps> = ({ isOpen, onClose, reviewResource, loadingAttempts, attemptsForReview, onRetake }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {reviewResource ? `Intentos — ${reviewResource.title}` : 'Intentos del recurso'}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {loadingAttempts ? (
            <HStack justify="center" py={8}>
              <Spinner />
              <Text>Cargando intentos…</Text>
            </HStack>
          ) : attemptsForReview.length > 0 ? (
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Número de intento</Th>
                  <Th isNumeric>Calificación</Th>
                </Tr>
              </Thead>
              <Tbody>
                {attemptsForReview.map((a) => (
                  <Tr key={`att-${a.attempt_number}`}>
                    <Td>#{a.attempt_number}</Td>
                    <Td isNumeric>{typeof a.final_score === 'number' ? `${a.final_score.toFixed(1)}%` : '—'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <Alert status="info" borderRadius="md">
              <AlertIcon />
              Aún no hay intentos registrados para este recurso.
            </Alert>
          )}
        </ModalBody>
        <ModalFooter>
          <HStack spacing={3}>
            <Button colorScheme="blue" onClick={() => { if (reviewResource) onRetake(reviewResource) }} isDisabled={!reviewResource}>Reintentar</Button>
            <Button variant="ghost" onClick={onClose}>Salir</Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

export default AttemptsModal

