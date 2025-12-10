import { Container, Box, Heading, Text, VStack, List, ListItem } from '@chakra-ui/react'

export default function Privacy() {
  return (
    <Container maxW="4xl" py={{ base: '6', md: '10' }} px={{ base: '4', md: '6' }}>
      <Box bg="white" p={{ base: '6', md: '8' }} borderRadius="xl" boxShadow="lg" border="1px" borderColor="gray.200">
        <VStack align="stretch" spacing={{ base: '4', md: '6' }}>
          <Heading size="lg" color="gray.700">Política de Privacidad</Heading>
          <Text color="gray.600">Última actualización: 10/12/2025</Text>

          <Heading size="md" color="gray.700">Responsable</Heading>
          <Text color="gray.700">
            Learn Playing es responsable del tratamiento de tus datos personales en la plataforma.
          </Text>

          <Heading size="md" color="gray.700">Datos que Recopilamos</Heading>
          <List spacing="2" color="gray.700">
            <ListItem>Datos de registro: nombre, apellido, email, fecha de nacimiento y nivel académico.</ListItem>
            <ListItem>Datos de uso: recursos generados, intentos, puntajes, progreso y ranking.</ListItem>
            <ListItem>Datos técnicos: identificadores de sesión, métricas básicas de interacción.</ListItem>
          </List>

          <Heading size="md" color="gray.700">Finalidades</Heading>
          <List spacing="2" color="gray.700">
            <ListItem>Crear tu cuenta y gestionar el acceso.</ListItem>
            <ListItem>Generar contenidos educativos personalizados y actividades H5P.</ListItem>
            <ListItem>Registrar intentos, puntajes y mostrar ranking.</ListItem>
            <ListItem>Mejorar el servicio y experiencia de aprendizaje.</ListItem>
          </List>

          <Heading size="md" color="gray.700">Base Legal</Heading>
          <List spacing="2" color="gray.700">
            <ListItem>Ejecución del contrato: prestación del servicio educativo.</ListItem>
            <ListItem>Consentimiento: comunicaciones y algunos tratamientos opcionales.</ListItem>
            <ListItem>Interés legítimo: mejora y seguridad del servicio.</ListItem>
          </List>

          <Heading size="md" color="gray.700">Conservación</Heading>
          <Text color="gray.700">
            Conservamos tus datos mientras tu cuenta esté activa y durante el tiempo necesario para cumplir obligaciones legales o atender
            reclamaciones. Puedes solicitar la eliminación de tu cuenta.
          </Text>

          <Heading size="md" color="gray.700">Destinatarios y Transferencias</Heading>
          <Text color="gray.700">
            Usamos proveedores para la infraestructura y generación de contenidos. Estos pueden procesar datos de forma segura y conforme
            a contratos de encargo de tratamiento.
          </Text>
          <List spacing="2" color="gray.700">
            <ListItem>Base de datos y autenticación: Supabase.</ListItem>
            <ListItem>Generación de contenido por IA: proveedor de API de IA.</ListItem>
            <ListItem>Plantillas y motor de actividades: H5P.</ListItem>
          </List>

          <Heading size="md" color="gray.700">Cookies y Tecnologías Similares</Heading>
          <Text color="gray.700">
            Podemos usar cookies técnicas para asegurar el funcionamiento de la plataforma y recordar tu sesión. Puedes gestionar cookies
            desde la configuración de tu navegador.
          </Text>

          <Heading size="md" color="gray.700">Tus Derechos</Heading>
          <List spacing="2" color="gray.700">
            <ListItem>Acceso, rectificación y supresión de datos.</ListItem>
            <ListItem>Limitación u oposición al tratamiento cuando proceda.</ListItem>
            <ListItem>Portabilidad de datos en los casos previstos por la ley.</ListItem>
            <ListItem>Retirar el consentimiento en cualquier momento.</ListItem>
          </List>

          <Heading size="md" color="gray.700">Seguridad</Heading>
          <Text color="gray.700">
            Implementamos medidas técnicas y organizativas para proteger tus datos. No obstante, ningún servicio es 100% seguro; actúa con
            precaución y protege tus credenciales.
          </Text>

          <Heading size="md" color="gray.700">Menores</Heading>
          <Text color="gray.700">
            Si eres menor de edad, debes contar con autorización de tus padres o tutores. Podemos solicitar confirmación en casos necesarios.
          </Text>

        

          <Heading size="md" color="gray.700">Actualizaciones</Heading>
          <Text color="gray.700">
            Esta política puede actualizarse. Te informaremos cambios relevantes y continuaremos protegiendo tus datos personales conforme
            a la normativa aplicable.
          </Text>
        </VStack>
      </Box>
    </Container>
  )
}
