# Matriz laboral de asistencia y disponibilidad

**Estado:** especificación funcional base para aprobación  
**Versión:** 1.0  
**Responsable de decisión:** Administrador del ERP / Coordinación HSEQ  
**Zona horaria:** America/Bogota

## 1. Propósito

La matriz laboral debe responder, para cada persona y periodo:

- si debía trabajar;
- dónde o bajo qué modalidad debía cumplir;
- si cumplió la jornada;
- si faltó;
- si la ausencia estaba justificada;
- si se encontraba en descanso, vacaciones, incapacidad, licencia, permiso, suspensión o retiro;
- si además debía asistir a una actividad y cuál fue el resultado de esa asistencia.

La matriz no reemplaza el expediente de eventos ni convierte una asistencia a una charla en prueba de cumplimiento de toda la jornada. Tampoco debe confundir una novedad laboral con una ausencia a una capacitación.

## 2. Separación obligatoria de conceptos

### 2.1 Estado maestro de la persona

Describe la relación general de la persona con la empresa y cambia con poca frecuencia:

- `activo`
- `inactivo`
- `retirado`

`descanso` y `vacaciones` no deben mantenerse como estados maestros permanentes. Son periodos temporales y deben gestionarse como novedades laborales.

### 2.2 Condición laboral del periodo

Describe qué estaba ocurriendo durante un intervalo concreto del día:

- disponible o programado;
- descanso programado;
- vacaciones;
- incapacidad;
- licencia remunerada;
- licencia no remunerada;
- permiso;
- comisión o actividad externa;
- servicio operativo o ruta;
- trabajo remoto;
- suspensión;
- retiro efectivo;
- sin programación.

Una persona puede tener más de un segmento en el mismo día. Por ejemplo: permiso de 08:00 a 10:00 y jornada disponible de 10:00 a 17:00.

### 2.3 Resultado de jornada

Determina el cumplimiento laboral del periodo exigible:

- presente;
- tardanza;
- cumplimiento parcial;
- trabajando en ruta o servicio externo;
- trabajando de forma remota;
- ausencia justificada;
- ausencia no justificada;
- pendiente de revisión;
- no exigible;
- anulado.

### 2.4 Resultado de un evento

Se conserva en el expediente de la actividad y no reemplaza el resultado laboral:

- presente;
- tardanza;
- participación parcial;
- ausencia justificada;
- ausencia no justificada;
- no aplica;
- anulado.

Una persona puede cumplir su jornada conduciendo en ruta y, al mismo tiempo, no asistir a una capacitación. La matriz laboral debe marcar cumplimiento en ruta; el evento debe registrar por separado si su ausencia fue justificada o no.

## 3. Población controlada

La matriz incluirá por defecto:

- personal administrativo;
- gerencia;
- coordinaciones y supervisión;
- conductores y demás personal operativo;
- contratistas recurrentes sujetos a programación o control de jornada.

No generarán faltas laborales automáticas:

- capacitadores externos;
- visitantes;
- invitados ocasionales;
- proveedores o contratistas sin programación controlada.

Estas personas externas sí pueden participar y firmar en eventos. Solo ingresarán a la matriz laboral si el administrador las clasifica expresamente como población controlada.

El nivel de riesgo o la clase de riesgo no cambia el mecanismo de registro ni separa a las personas. Podrá utilizarse únicamente como filtro o dimensión de reporte.

## 4. Matriz de clasificación

| Situación comprobada | ¿Estaba programado? | ¿Se exige presencia laboral? | Resultado laboral | Tratamiento en un evento obligatorio coincidente |
|---|---:|---:|---|---|
| Registró entrada válida y cumplió el periodo | Sí | Sí | Presente | Asistencia del evento se valida por sus propias reglas |
| Registró después de la tolerancia | Sí | Sí | Tardanza | Puede ser presente o tardanza en el evento |
| Cumplió solo una parte de la jornada | Sí | Sí | Cumplimiento parcial | Se revisa permanencia del evento por separado |
| Está prestando servicio o conduciendo en ruta | Sí | Sí, fuera de sede | Cumplimiento en ruta | La ausencia al evento puede justificarse; no equivale a falta laboral |
| Trabajo remoto autorizado | Sí | Sí, remoto | Cumplimiento remoto | Debe cumplir la validación remota si fue convocado |
| Comisión o actividad externa aprobada | Sí | Sí, fuera de sede | Cumplimiento externo | Ausencia justificada salvo que el evento forme parte de la comisión |
| Descanso programado | No | No | No exigible: descanso | No aplica o ausencia justificada según decisión administrativa |
| Vacaciones aprobadas | No | No | No exigible: vacaciones | No aplica |
| Incapacidad aprobada | No | No | No exigible: incapacidad | Ausencia justificada o no aplica |
| Licencia aprobada | No | No | No exigible: licencia | Ausencia justificada o no aplica |
| Permiso total aprobado | No durante el intervalo | No durante el intervalo | No exigible: permiso | Se evalúa contra el horario exacto del evento |
| Permiso parcial aprobado | Parcial | Sí fuera del permiso | Resultado por segmentos | Se evalúa contra la franja horaria del evento |
| Suspensión vigente | No | No | No exigible: suspensión | No aplica |
| Retiro efectivo o persona inactiva | No | No | Fuera de población | No debe ser convocado como obligatorio |
| Sin programación registrada | No determinada | No se presume | Pendiente de programación | No se debe convertir automáticamente en falta |
| Programado, sin registro ni novedad aprobada al cierre | Sí | Sí | Ausencia no justificada | Ausencia no justificada si también era convocatoria obligatoria |
| Programado, sin registro, con justificación posterior aprobada | Sí | Sí | Ausencia justificada | Ausencia justificada |

## 5. Reglas de decisión

### 5.1 Cuándo una persona “faltó”

Solo se puede concluir `ausencia_no_justificada` cuando se cumplen todas estas condiciones:

1. la persona pertenecía a la población controlada;
2. estaba activa y programada para el intervalo;
3. no tenía una exclusión o novedad aprobada que cubriera el intervalo;
4. no existe evidencia válida de cumplimiento presencial, remoto, en ruta o externo;
5. venció la hora de corte configurada;
6. el administrador cerró o concilió el resultado.

La ausencia nunca se debe inferir únicamente porque no aparezca una firma en un evento.

### 5.2 Cuándo una persona “no asistió”

`No asistió` es un resultado específico de evento. Requiere convocatoria obligatoria y ausencia de asistencia válida conforme a las reglas de ese evento. Después se clasifica como justificada o no justificada usando la matriz laboral y la decisión administrativa.

### 5.3 Estados provisionales y definitivos

- Durante la jornada: `pendiente` o resultado preliminar.
- Al vencer la hora de corte: `pendiente_revision` si falta información.
- Después de la decisión del administrador: resultado definitivo.
- Una corrección posterior exige reapertura, motivo, responsable, fecha y nueva revisión.

Ningún proceso automático cerrará una ausencia como definitiva sin permitir revisión administrativa.

## 6. Precedencia y conflictos

Las novedades incompatibles no se resolverán silenciosamente. El ERP debe mostrar un conflicto para decisión del administrador.

Para presentar un estado provisional se utilizará esta precedencia:

1. retiro o inactividad efectiva;
2. suspensión;
3. incapacidad;
4. licencia;
5. vacaciones;
6. permiso;
7. comisión, actividad externa, ruta o trabajo remoto;
8. descanso programado;
9. disponibilidad ordinaria.

Reglas adicionales:

- una novedad pendiente no modifica el resultado definitivo;
- una novedad aprobada se aplica por intervalo, no solo por fecha;
- rechazar, anular o modificar una novedad debe recalcular los periodos todavía abiertos;
- un resultado ya cerrado no se sobrescribe: se abre una nueva revisión;
- dos novedades aprobadas que se solapen deben quedar marcadas como conflicto, incluso si existe una precedencia visual;
- el administrador conserva la decisión final y toda excepción requiere observación.

## 7. Fuentes de información

| Fuente | Uso en la matriz | Autoridad |
|---|---|---|
| Persona | Identidad, vínculo, perfil, contratista y estado maestro | Administración |
| Programación, turno o asignación | Define si la persona era exigible y el horario esperado | Administración / Logística |
| Novedad laboral | Explica disponibilidad o exclusión por intervalo | Administrador después de aprobar |
| Registro de jornada | Entrada, salida y modalidad de cumplimiento | Usuario o sistema; conciliación administrativa |
| Viaje, ruta o servicio | Prueba contexto operativo fuera de sede | Logística / Operación |
| Evento de formación | Resultado de una convocatoria específica | Expediente del evento |
| Soporte externo | URL de Drive u otra fuente documental autorizada | Según aprobación |
| Ajuste manual | Corrección excepcional | Solo administrador, con motivo y auditoría |

La asistencia a un evento puede aportar evidencia, pero no es la única fuente para declarar cumplimiento de jornada.

## 8. Datos mínimos de cada registro de matriz

- fecha y zona horaria;
- persona y copia histórica de nombre, documento, perfil y contratista;
- intervalo esperado de inicio y fin;
- fuente de la programación;
- condición laboral por segmento;
- indicación de si era exigible;
- hora de entrada y salida, cuando aplique;
- modalidad o lugar de cumplimiento;
- novedad relacionada y su soporte;
- actividades obligatorias del intervalo y sus resultados independientes;
- resultado preliminar;
- resultado definitivo;
- motivo y observaciones;
- persona que decidió;
- fecha de decisión;
- revisión y trazabilidad de reaperturas.

## 9. Flujo operativo

1. El sistema construye la población del día a partir de personas activas y controladas.
2. Incorpora programación, turnos, asignaciones, rutas y trabajo remoto.
3. Cruza novedades aprobadas por intervalo.
4. Presenta una matriz provisional al administrador.
5. Durante el día incorpora registros de jornada y contexto operativo.
6. Los eventos se muestran como obligaciones adicionales, sin reemplazar la jornada.
7. Al vencer la hora de corte se resaltan faltantes, conflictos y registros pendientes.
8. El administrador concilia y cierra el día.
9. Las correcciones posteriores generan una nueva revisión auditable.
10. Los PDF e informes se generan solo cuando un usuario autorizado los solicita.

## 10. Pantalla propuesta

### Vista principal

- selector día, semana o mes;
- filtros por contratista, perfil, sede, proyecto y condición;
- indicadores: programados, cumplieron, ruta/remoto, no exigibles, ausencias justificadas, ausencias no justificadas y pendientes;
- matriz con personas en filas y días o segmentos en columnas;
- colores acompañados siempre de texto e icono;
- alerta visible de conflictos y periodos sin programación.

### Detalle de celda o persona

Al seleccionar una celda se abre el expediente completo del periodo:

- horario esperado;
- segmentos del día;
- registros de entrada y salida;
- ruta, asignación o modalidad;
- novedades y soportes;
- eventos coincidentes;
- resultado propuesto y resultado definitivo;
- historial de decisiones y revisiones.

### Navegación recomendada

Dentro de Asistencia:

- Resumen y calendario;
- Eventos y asistencia;
- Matriz laboral;
- Novedades laborales;
- Informes.

## 11. Indicadores

Las fórmulas deben ser visibles y versionadas.

- **Programados:** personas con jornada o servicio asignado.
- **No exigibles:** programados inicialmente pero cubiertos por una exclusión aprobada, más personas sin jornada por descanso programado.
- **Exigibles:** programados menos exclusiones aprobadas aplicables.
- **Cumplimiento laboral:** presente + cumplimiento parcial ponderado según regla aprobada + ruta/servicio + remoto + comisión cumplida.
- **Ausencia justificada:** persona exigible que no cumplió, pero cuya justificación fue aprobada.
- **Ausencia no justificada:** persona exigible sin cumplimiento ni justificación aprobada al cierre.
- **Cobertura laboral:** cumplimientos válidos / exigibles.
- **Cumplimiento de evento:** asistentes válidos / convocados obligatorios aplicables.

Los indicadores laborales y los indicadores de eventos se reportarán separados.

## 12. Evidencia, auditoría y documentos

- Los soportes pesados permanecerán en Google Drive u otra fuente autorizada; el ERP guardará URL, metadatos y trazabilidad.
- Cada decisión administrativa conservará actor, fecha, valor anterior, valor nuevo y motivo.
- Un cierre mensual no eliminará la posibilidad de corrección, pero toda corrección generará una revisión.
- Los PDF no serán automáticos.
- Se permitirá PDF diario, PDF mensual y exportación tabular para análisis.
- Cada documento debe usar el catálogo documental vigente: código, versión, proceso, fecha de generación y responsable.
- La firma de cierre administrativo se incorporará cuando el formato aplicable la exija.

## 13. Permisos

- **Administrador / HSEQ:** configura reglas, aprueba novedades, concilia, cierra, reabre, corrige y genera documentos.
- **Usuario interno autorizado / Logística:** registra programación, propone novedades y consulta el alcance asignado; no toma decisiones definitivas salvo autorización expresa.
- **Conductor o empleado:** registra su actuación o presenta una solicitud/soporte; no aprueba su propio resultado.
- **Externo:** solo participa en el flujo específico de un evento y no accede a la matriz laboral.

Mientras la estructura organizacional siga centralizada, toda decisión definitiva será del administrador.

## 14. Relación con lo que ya existe

Se reutilizarán:

- `NovedadPersonal` para periodos y aprobación;
- `EventoParticipante.condicionLaboral` como fotografía del contexto del evento;
- `resultadoPreliminar` y `resultadoDefinitivo` para el expediente de evento;
- el registro de auditoría existente;
- el calendario de asistencia;
- las asignaciones, turnos y viajes como fuentes operativas;
- el catálogo documental y los generadores PDF existentes.

Antes de implementar se deben corregir estas brechas actuales:

- `Persona.estado` todavía mezcla estados maestros con descanso y vacaciones;
- no existe una entidad diaria o segmentada que consolide programación y resultado laboral;
- no están definidas precedencias ni conflictos entre novedades solapadas;
- aprobar una novedad actualiza participantes pendientes, pero rechazarla o anularla no recalcula el contexto ya propagado;
- la creación de eventos toma una sola novedad coincidente sin resolver formalmente solapamientos;
- la pantalla histórica muestra registros de eventos, pero todavía no responde por sí sola quién debía trabajar ese día;
- `justificado` en registros heredados no tiene aún el mismo nivel de trazabilidad que la conciliación de eventos.

## 15. Fases de implementación propuestas

1. **Fundamento laboral:** catálogo parametrizable, población controlada, programación, segmentos y motor de conflictos.
2. **Matriz diaria:** cálculo provisional, conciliación administrativa y cierre por revisión.
3. **Integración operativa:** asignaciones, turnos, viajes, ruta y trabajo remoto.
4. **Integración con eventos:** aplicar disponibilidad a convocatorias sin mezclar resultados.
5. **Informes auditables:** indicadores, PDF diario/mensual, exportación y firma de cierre.
6. **Automatización progresiva:** recordatorios y sugerencias, sin decisiones definitivas automáticas.

## 16. Criterios de aceptación

La fase estará completa cuando el administrador pueda:

- seleccionar cualquier fecha y ver toda la población controlada;
- identificar quién debía trabajar y quién no;
- distinguir presencia, ruta, remoto, descanso, vacaciones, incapacidad, licencias, permisos y faltas;
- abrir el detalle y conocer la fuente de cada clasificación;
- detectar novedades solapadas o información incompleta;
- conciliar sin perder el historial;
- diferenciar falta laboral de inasistencia a un evento;
- consultar una persona por día, semana o mes;
- generar un documento auditable bajo demanda;
- demostrar quién tomó cada decisión y cuándo.

## 17. Decisiones que deben aprobarse antes de programar

1. Confirmar que la población controlada inicial incluye administrativos, gerencia, conductores y contratistas recurrentes.
2. Definir la fuente inicial de programación: asignaciones existentes, programación manual o ambas.
3. Definir horas de corte por tipo de jornada, sin imponer una única hora a toda la empresa.
4. Confirmar que permisos y novedades podrán registrarse por horas, no solo por días completos.
5. Aprobar si el primer cierre será diario individual, diario masivo o ambos.
6. Definir el código y versión del formato oficial de matriz laboral dentro del catálogo documental.

