# Conector central de Google Forms

El contenido pesado, las preguntas, imágenes, videos y respuestas permanecen en Google Forms. El ERP conserva únicamente la trazabilidad mínima necesaria para asistencia: actividad, documento, identificador de respuesta, fecha, estado y puntaje.

## Configuración única

Esta configuración se realiza una sola vez con `transserviceshseq.ab@gmail.com`. Después, cada formulario se conecta desde el expediente de la actividad sin copiar scripts ni crear activadores manuales. El ERP sincroniza al regresar del formulario y ofrece una conciliación administrativa; así evita el límite de 20 activadores por usuario y script de Apps Script.

1. Crea un proyecto independiente en [Google Apps Script](https://script.google.com/).
2. Copia el contenido de `scripts/google-forms-central-connector.gs` en `Código.gs`.
3. Activa **Mostrar el archivo de manifiesto appsscript.json** en la configuración del proyecto y reemplázalo con `scripts/google-forms-central-appsscript.json`.
4. En **Configuración del proyecto > Propiedades del script**, crea `CONNECTOR_SECRET` con un valor aleatorio largo. Debe ser igual a `GOOGLE_FORMS_CONNECTOR_SECRET` en Railway.
5. Selecciona **Implementar > Nueva implementación > Aplicación web**.
6. Configura **Ejecutar como: Yo** y permite el acceso a quien tenga el enlace. Autoriza Forms y conexiones externas con la cuenta documental.
7. Copia la URL terminada en `/exec` y guárdala en Railway como `GOOGLE_FORMS_CONNECTOR_URL`.
8. Configura también `GOOGLE_FORMS_WEBHOOK_SECRET`; el ERP lo entrega cifrado por HTTPS al conector para autenticar las respuestas.

En Railway, `PUBLIC_APP_URL` debe corresponder al dominio del ambiente. Para producción:

```text
PUBLIC_APP_URL=https://erp.transservicesab.com
GOOGLE_FORMS_CONNECTOR_URL=https://script.google.com/macros/s/.../exec
GOOGLE_FORMS_CONNECTOR_SECRET=<secreto-del-conector>
GOOGLE_FORMS_WEBHOOK_SECRET=<secreto-del-webhook>
```

## Uso diario

1. En Google Forms crea una pregunta obligatoria llamada `Número de documento`.
2. En el ERP crea la actividad y pega el enlace de **edición** del formulario, terminado en `/edit`.
3. El ERP registra el formulario y obtiene automáticamente el enlace público para los participantes.
4. Si existían respuestas anteriores, se importan de forma idempotente. El botón **Sincronizar respuestas** permite repetir la conciliación sin duplicar registros.

La cuenta del conector debe ser propietaria o editora de cada formulario. Cada formulario se asigna a una sola actividad para evitar mezclar respuestas históricas; si necesitas repetirlo, duplica el formulario. No se deben incluir secretos como preguntas ni compartir el enlace de edición con participantes.

## Recuperación

- **Pendiente:** falta configurar el conector del ambiente o conectar el formulario.
- **Requiere atención:** revisa el mensaje en el expediente, corrige el enlace o los permisos y pulsa **Reconectar**.
- **Respuesta no encontrada:** confirma que se utilizó el mismo documento y pulsa **Sincronizar respuestas**. Google Forms continúa siendo la fuente original aunque una entrega al ERP falle temporalmente.

`scripts/google-forms-attendance.gs` se conserva únicamente para formularios heredados que todavía tengan un activador manual.
