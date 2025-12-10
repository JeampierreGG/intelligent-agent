import { Container, Box, Heading, Text, VStack, List, ListItem } from '@chakra-ui/react'

export default function Terms() {
  return (
    <Container maxW="4xl" py={{ base: '6', md: '10' }} px={{ base: '4', md: '6' }}>
      <Box bg="white" p={{ base: '6', md: '8' }} borderRadius="xl" boxShadow="lg" border="1px" borderColor="gray.200">
        <VStack align="stretch" spacing={{ base: '4', md: '6' }}>
          <Heading size="lg" color="gray.700">Términos y Condiciones</Heading>
          <Text color="gray.600">Última actualización: 10/12/2025</Text>

          <Text color="gray.700">
            Bienvenido a Learn Playing. Al usar nuestra plataforma aceptas estos Términos y Condiciones.
            Si no estás de acuerdo, no debes utilizar el servicio.
          </Text>

          <Heading size="md" color="gray.700">Definiciones</Heading>
          <List spacing="2" color="gray.700">
            <ListItem>Plataforma: el sitio y aplicaciones de Learn Playing.</ListItem>
            <ListItem>Usuario: persona que se registra o utiliza la plataforma.</ListItem>
            <ListItem>Contenido: recursos educativos, actividades H5P y materiales generados por IA.</ListItem>
          </List>

          <Heading size="md" color="gray.700">Aceptación del Acuerdo</Heading>
          <Text color="gray.700">
            El uso de la plataforma implica la aceptación plena de estos términos y de la Política de Privacidad.
            Podemos actualizar estos documentos y te notificaremos cambios relevantes.
          </Text>

          <Heading size="md" color="gray.700">Elegibilidad</Heading>
          <Text color="gray.700">
            El servicio está dirigido a estudiantes de 10 años en adelante. Los menores deben contar con autorización
            de sus padres o tutores según las leyes aplicables.
          </Text>

          <Heading size="md" color="gray.700">Cuenta y Seguridad</Heading>
          <Text color="gray.700">
            Debes proporcionar información veraz y mantener la confidencialidad de tus credenciales. Eres responsable de
            todas las actividades realizadas con tu cuenta. Notifícanos de inmediato cualquier acceso no autorizado.
          </Text>

          <Heading size="md" color="gray.700">Uso Aceptable</Heading>
          <List spacing="2" color="gray.700">
            <ListItem>No publicar contenido ilegal, ofensivo o que infrinja derechos de terceros.</ListItem>
            <ListItem>No intentar vulnerar la seguridad o disponibilidad del servicio.</ListItem>
            <ListItem>No usar la plataforma para fines distintos al aprendizaje y práctica autorizados.</ListItem>
          </List>

          <Heading size="md" color="gray.700">Contenido Generado por IA y H5P</Heading>
          <Text color="gray.700">
            Los recursos se generan a partir de tus entradas (curso, tema, nivel, edad y dificultad) mediante una API de IA
            y se integran en plantillas H5P. Aunque buscamos calidad y pertinencia, el contenido puede contener errores.
            Debes revisar críticamente el material y reportar inconsistencias.
          </Text>

          <Heading size="md" color="gray.700">Propiedad Intelectual</Heading>
          <Text color="gray.700">
            Los derechos sobre la plataforma pertenecen a Learn Playing y sus licenciantes. Te otorgamos una licencia limitada,
            personal, no exclusiva y no transferible para usar el servicio. No se permite la redistribución o explotación comercial
            del contenido salvo autorización expresa.
          </Text>

          <Heading size="md" color="gray.700">Puntuaciones y Ranking</Heading>
          <Text color="gray.700">
            Las actividades generan puntajes y ranking global. Nos reservamos el derecho de ajustar, auditar o invalidar puntajes
            ante sospecha de fraude, uso indebido o errores técnicos.
          </Text>

          <Heading size="md" color="gray.700">Limitación de Responsabilidad</Heading>
          <Text color="gray.700">
            La plataforma se ofrece "tal cual" y "según disponibilidad". En la medida permitida por la ley, no seremos responsables
            por daños indirectos, incidentales o consecuentes derivados del uso del servicio.
          </Text>

          <Heading size="md" color="gray.700">Modificaciones</Heading>
          <Text color="gray.700">
            Podemos modificar el servicio y estos términos. Cuando los cambios sean sustanciales, te informaremos por medios razonables
            y continuaremos ofreciendo acceso a la versión actualizada.
          </Text>

          <Heading size="md" color="gray.700">Terminación</Heading>
          <Text color="gray.700">
            Podemos suspender o cerrar cuentas que incumplan estos términos. Puedes solicitar la eliminación de tu cuenta cuando lo desees.
          </Text>

          <Heading size="md" color="gray.700">Jurisdicción y Ley Aplicable</Heading>
          <Text color="gray.700">
            Este acuerdo se rige por las leyes aplicables en tu país o región de residencia. Cualquier disputa se resolverá ante los tribunales
            competentes conforme a dichas leyes.
          </Text>

      
        </VStack>
      </Box>
    </Container>
  )
}
