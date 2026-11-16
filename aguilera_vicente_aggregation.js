const dbLab = db.getSiblingDB("laboratorio_universitario");

// 1. Análisis de actividad experimental
dbLab.experimentos.aggregate([
   { $match: { estado: { $in: ["finalizado", "pendiente"] }, duracion: { $gt: 60 } } },
   { $set: { duracionHoras: { $round: [{ $divide: ["$duracion", 60] }, 2] } } },
   { $sort: { fecha: -1, _id: 1 } },
   { $project: { _id: 0, nombre: 1, tipo: 1, estado: 1,
                 duracion: 1, duracionHoras: 1, fecha: 1 } },
   { $limit: 5 }
 ]).forEach(printjson);
// Análisis: Los cancelados duran 25 y 35 minutos, así que no entrarían al filtro de más de 60.
// El reporte muestra solo 5 casos recientes, no toda la actividad.
// Decisión: Primero filtro, después calculo las horas y dejo los 5 más recientes.

// 2. Clasificación y ranking de experimentos
dbLab.experimentos.aggregate([
   { $match: { estado: "finalizado" } },
   { $sort: { duracion: -1, _id: 1 } },
   { $skip: 3 },
   { $limit: 5 },
   { $project: {
       _id: 0, nombre: 1, duracion: 1, fecha: 1,
       categoriaDuracion: {
         $cond: [
           { $lt: ["$duracion", 60] }, "Breve",
           { $cond: [{ $lte: ["$duracion", 120] }, "Moderado", "Extenso"] }
         ]
       }
   } }
 ]).forEach(printjson);
// Análisis: Hay 13 finalizados y aquí aparecen los puestos 4 al 8.
// La duración no basta para decidir gastos; también importan los costos y materiales.
// Decisión: Ordeno por duración e identificador antes de saltar los 3 primeros.

// 3. Distribución de experimentos por tipo y estado
dbLab.experimentos.aggregate([
   { $group: {
       _id: { tipo: "$tipo", estado: "$estado" },
       cantidad: { $sum: 1 },
       duracionPromedio: { $avg: "$duracion" },
       duracionMinima: { $min: "$duracion" },
       duracionMaxima: { $max: "$duracion" }
   } },
   { $match: { cantidad: { $gte: 2 } } },
   { $set: { duracionPromedio: { $round: ["$duracionPromedio", 2] } } },
   { $project: { _id: 0, tipo: "$_id.tipo", estado: "$_id.estado",
                 cantidad: 1, duracionPromedio: 1,
                 duracionMinima: 1, duracionMaxima: 1 } },
   { $sort: { cantidad: -1, tipo: 1, estado: 1 } }
 ]).forEach(printjson);
// Análisis: Quedan 6 grupos con al menos 2 experimentos y otros 4 no aparecen.
// Genético y microbiológico tienen 4 finalizados cada uno, pero eso no prueba una relación.
// Decisión: Agrupo por tipo y estado y después elimino los grupos pequeños.

// 4. Productividad por investigador
dbLab.experimentos.aggregate([
   { $group: {
       _id: "$investigadorId",
       total: { $sum: 1 },
       finalizados: { $sum: { $cond: [{ $eq: ["$estado", "finalizado"] }, 1, 0] } },
       pendientes: { $sum: { $cond: [{ $eq: ["$estado", "pendiente"] }, 1, 0] } },
       cancelados: { $sum: { $cond: [{ $eq: ["$estado", "cancelado"] }, 1, 0] } },
       duracionPromedio: { $avg: "$duracion" },
       duracionTotal: { $sum: "$duracion" },
       duracionMaxima: { $max: "$duracion" }
   } },
   { $lookup: { from: "investigadores", localField: "_id",
                foreignField: "_id", as: "investigador" } },
   { $unwind: "$investigador" },
   { $project: { _id: 0, investigador: "$investigador.nombre", total: 1,
                 finalizados: 1, pendientes: 1, cancelados: 1,
                 duracionPromedio: { $round: ["$duracionPromedio", 2] },
                 duracionTotal: 1, duracionMaxima: 1 } },
   { $sort: { total: -1, investigador: 1 } }
 ]).forEach(printjson);
// Análisis: Camila tiene 4 experimentos (330 min) y Matías 3 (355 min).
// Tener más experimentos no significa ser más productivo; importa qué se hizo.
// Decisión: Uso $lookup para traer nombres; quienes no tienen experimentos no aparecen.

// 5. Trayectoria temporal de los investigadores
dbLab.experimentos.aggregate([
   { $sort: { fecha: 1, _id: 1 } },
   { $group: {
       _id: "$investigadorId",
       fechaPrimerExperimento: { $first: "$fecha" },
       primerExperimento: { $first: "$nombre" },
       fechaUltimoExperimento: { $last: "$fecha" },
       ultimoExperimento: { $last: "$nombre" },
       totalExperimentos: { $sum: 1 },
       listaExperimentos: { $push: "$nombre" }
   } },
   { $lookup: { from: "investigadores", localField: "_id",
                foreignField: "_id", as: "investigador" } },
   { $unwind: "$investigador" },
   { $project: { _id: 0, investigador: "$investigador.nombre",
                 especialidad: "$investigador.especialidad",
                 fechaPrimerExperimento: 1, primerExperimento: 1,
                 fechaUltimoExperimento: 1, ultimoExperimento: 1,
                 totalExperimentos: 1, listaExperimentos: 1 } },
   { $sort: { fechaUltimoExperimento: -1, investigador: 1 } }
 ]).forEach(printjson);
// Análisis: Sebastián tiene el registro más reciente, pero solo un experimento.
// Eso no demuestra trabajo constante; faltaría revisar la actividad entre fechas.
// Decisión: Ordeno por fecha antes de usar $first y $last, y traigo los nombres.

// 6. Análisis estadístico de mediciones
dbLab.mediciones.aggregate([
   { $group: {
       _id: "$variable", cantidad: { $sum: 1 },
       minimo: { $min: "$valor" }, maximo: { $max: "$valor" },
       promedio: { $avg: "$valor" }
   } },
   { $set: { promedio: { $round: ["$promedio", 2] } } },
   { $set: {
       categoria: {
         $cond: [
           { $lt: ["$promedio", 10] }, "Bajo",
           { $cond: [{ $lte: ["$promedio", 20] }, "Medio", "Alto"] }
         ]
       }
   } },
   { $project: { _id: 0, variable: "$_id", cantidad: 1,
                 minimo: 1, maximo: 1, promedio: 1, categoria: 1 } },
   { $sort: { promedio: -1, variable: 1 } }
 ]).forEach(printjson);
// Análisis: Viabilidad tiene 4 mediciones (promedio 84) y crecimiento 11 (9,01).
// No basta con comparar promedios: hay distintas cantidades y variables.
// Decisión: Agrupo por variable y redondeo los promedios a dos decimales.

// 7. Análisis de observaciones de muestras
dbLab.muestras.aggregate([
   { $unwind: "$observaciones" },
   { $group: { _id: "$tipo", cantidadObservaciones: { $sum: 1 },
               listaObservaciones: { $push: "$observaciones" } } },
   { $project: { _id: 0, tipo: "$_id",
                 cantidadObservaciones: 1, listaObservaciones: 1 } },
   { $sort: { cantidadObservaciones: -1, tipo: 1 } }
 ]).forEach(printjson);
dbLab.muestras.aggregate([
   { $unwind: { path: "$observaciones", preserveNullAndEmptyArrays: true } },
   { $group: {
       _id: { tipo: "$tipo", codigo: "$codigo" },
       cantidadObservaciones: {
         $sum: { $cond: [
           { $ne: [{ $ifNull: ["$observaciones", null] }, null] }, 1, 0
         ] }
       }
   } },
   { $group: {
       _id: "$_id.tipo",
       cantidadMuestras: { $sum: 1 },
       conObservaciones: {
         $sum: { $cond: [{ $gt: ["$cantidadObservaciones", 0] }, 1, 0] }
       },
       sinObservaciones: {
         $sum: { $cond: [{ $eq: ["$cantidadObservaciones", 0] }, 1, 0] }
       }
   } },
   { $project: { _id: 0, tipo: "$_id", cantidadMuestras: 1,
                 conObservaciones: 1, sinObservaciones: 1 } },
   { $sort: { cantidadMuestras: -1, tipo: 1 } }
 ]).forEach(printjson);
// Análisis: Hay 12 muestras, pero 3 no tienen observaciones y quedan fuera de A.
// Si usamos solo A, faltaría información de sangre, tejido y cultivo.
// Decisión: En B conservo los arreglos vacíos o nulos y cuento cada muestra.

// 8. Identificación de responsables ausentes
dbLab.experimentos.aggregate([
   { $match: { responsable: null } },
   { $set: {
       estadoResponsable: {
         $cond: [
           { $eq: [{ $ifNull: ["$responsable", null] }, null] },
           "Sin asignar", "Asignado"
         ]
       }
   } },
   { $sort: { fecha: -1, _id: 1 } },
   { $project: { _id: 1, nombre: 1, tipo: 1, estado: 1,
                 estadoResponsable: 1 } }
 ]).forEach(printjson);
dbLab.experimentos.aggregate([
   { $match: { responsable: null } },
   { $count: "cantidadSinResponsable" }
 ]).forEach(printjson);
// Análisis: Hay 3 experimentos sin responsable. No sabemos si es un error o falta asignarlo.
// Lo mejor es revisar esos casos y completar el dato cuando corresponda.
// Decisión: Buscar responsable: null incluye campos vacíos y campos ausentes.

// 9. Consulta integrada de experimentos e investigadores
dbLab.experimentos.aggregate([
   { $lookup: { from: "investigadores", localField: "investigadorId",
                foreignField: "_id", as: "investigador" } },
   { $unwind: "$investigador" },
   { $match: { "investigador.especialidad": {
       $in: ["Genetica", "Microbiologia"]
   } } },
   { $project: { _id: 0, nombreExperimento: "$nombre", tipo: 1,
                 estado: 1, fecha: 1, duracion: 1,
                 nombreInvestigador: "$investigador.nombre",
                 especialidad: "$investigador.especialidad" } },
   { $sort: { fecha: -1, nombreExperimento: 1 } },
   { $limit: 10 }
 ]).forEach(printjson);
// Análisis: La base tiene 6 experimentos de Genética y 6 de Microbiología.
// El reporte solo muestra 10 recientes; para comparar bien habría que mirar todos y sus duraciones.
// Decisión: Uso $lookup para conocer la especialidad y luego filtro y limito.

// 10. Distribución por intervalos de duración
dbLab.experimentos.aggregate([
   { $bucket: {
       groupBy: "$duracion", boundaries: [0, 30, 60, 90, 120, 180, 300],
       default: "Fuera de rango",
       output: { cantidad: { $sum: 1 },
                 duracionPromedio: { $avg: "$duracion" },
                 duracionMaxima: { $max: "$duracion" } }
   } },
   { $set: { duracionPromedio: { $round: ["$duracionPromedio", 2] } } },
   { $project: { _id: 0, intervaloInferior: "$_id", cantidad: 1,
                 duracionPromedio: 1, duracionMaxima: 1 } },
   { $sort: { intervaloInferior: 1 } }
 ]).forEach(printjson);
dbLab.experimentos.aggregate([
   { $bucketAuto: {
       groupBy: "$duracion", buckets: 4,
       output: { cantidad: { $sum: 1 },
                 duracionPromedio: { $avg: "$duracion" } }
   } },
   { $project: { _id: 0, intervalo: "$_id", cantidad: 1,
                 duracionPromedio: { $round: ["$duracionPromedio", 2] } } },
   { $sort: { "intervalo.min": 1 } }
 ]).forEach(printjson);
// Análisis: $bucket usa rangos fijos y $bucketAuto reparte los datos en 4 grupos.
// Para planificar usaría rangos fijos; son más fáciles de comparar, aunque pueden quedar desiguales.
// Decisión: En A fijo los límites y en B dejo que MongoDB los calcule.

// 11. Reporte de finalizados y conteo total
dbLab.experimentos.aggregate([
   { $match: { estado: "finalizado" } },
   { $sort: { fecha: -1, _id: 1 } },
   { $skip: 5 },
   { $limit: 5 },
   { $project: { _id: 0, nombre: 1, tipo: 1, fecha: 1, duracion: 1 } }
 ]).forEach(printjson);
dbLab.experimentos.aggregate([
   { $match: { estado: "finalizado" } },
   { $count: "totalFinalizados" }
 ]).forEach(printjson);
// Análisis: Hay 13 finalizados, pero esta página muestra solo 5.
// Si entran registros nuevos, al cambiar de página pueden repetirse o faltar casos.
// Decisión: Uso $skip y $limit para la página y $count para el total.

// 12. Resumen de mediciones por experimento
dbLab.mediciones.aggregate([
   { $group: {
       _id: "$experimentoId", cantidadMediciones: { $sum: 1 },
       valorPromedio: { $avg: "$valor" },
       valorMinimo: { $min: "$valor" }, valorMaximo: { $max: "$valor" }
   } },
   { $lookup: { from: "experimentos", localField: "_id",
                foreignField: "_id", as: "experimento" } },
   { $unwind: "$experimento" },
   { $project: { _id: 0, nombre: "$experimento.nombre",
                 tipo: "$experimento.tipo", estado: "$experimento.estado",
                 duracion: "$experimento.duracion", cantidadMediciones: 1,
                 valorPromedio: { $round: ["$valorPromedio", 2] },
                 valorMinimo: 1, valorMaximo: 1 } },
   { $sort: { cantidadMediciones: -1, nombre: 1 } }
 ]).forEach(printjson);
// Análisis: Algunos experimentos tienen 4 mediciones, pero más datos no aseguran mejor calidad.
// También hay que mirar cuánto varían los valores y cómo se tomaron.
// Decisión: Agrupo las mediciones y uso $lookup para traer el experimento.

// 13. Productividad de todos los investigadores
dbLab.investigadores.aggregate([
   { $lookup: { from: "experimentos", localField: "_id",
                foreignField: "investigadorId", as: "experimentos" } },
   { $unwind: { path: "$experimentos", preserveNullAndEmptyArrays: true } },
   { $group: {
       _id: "$_id", investigador: { $first: "$nombre" },
       total: { $sum: { $cond: [
         { $ne: [{ $ifNull: ["$experimentos._id", null] }, null] }, 1, 0
       ] } },
       finalizados: { $sum: { $cond: [{ $eq: ["$experimentos.estado", "finalizado"] }, 1, 0] } },
       pendientes: { $sum: { $cond: [{ $eq: ["$experimentos.estado", "pendiente"] }, 1, 0] } },
       cancelados: { $sum: { $cond: [{ $eq: ["$experimentos.estado", "cancelado"] }, 1, 0] } },
       duracionPromedio: { $avg: "$experimentos.duracion" },
       duracionMaxima: { $max: "$experimentos.duracion" }
   } },
   { $project: { _id: 0, investigador: 1, total: 1,
                 finalizados: 1, pendientes: 1, cancelados: 1,
                 duracionPromedio: { $round: ["$duracionPromedio", 2] },
                 duracionMaxima: 1 } },
   { $sort: { total: -1, investigador: 1 } }
 ]).forEach(printjson);
// Análisis: Aparecen los 9 investigadores, incluida Daniela con 0 experimentos.
// Si la quitamos, el reporte no mostraría a todo el equipo.
// Decisión: Parto desde investigadores y conservo a quienes no tienen experimentos.

// 14. Reporte mensual de actividad del laboratorio
dbLab.experimentos.aggregate([
   { $match: { fecha: { $gte: ISODate("2026-01-01T00:00:00Z"),
                        $lt: ISODate("2027-01-01T00:00:00Z") } } },
   { $group: {
       _id: { anio: { $year: "$fecha" }, mes: { $month: "$fecha" } },
       total: { $sum: 1 },
       finalizados: { $sum: { $cond: [{ $eq: ["$estado", "finalizado"] }, 1, 0] } },
       pendientes: { $sum: { $cond: [{ $eq: ["$estado", "pendiente"] }, 1, 0] } },
       cancelados: { $sum: { $cond: [{ $eq: ["$estado", "cancelado"] }, 1, 0] } },
       duracionTotal: { $sum: "$duracion" },
       duracionPromedio: { $avg: "$duracion" }
   } },
   { $project: { _id: 0, anio: "$_id.anio", mes: "$_id.mes",
                 total: 1, finalizados: 1, pendientes: 1,
                 cancelados: 1, duracionTotal: 1,
                 duracionPromedio: { $round: ["$duracionPromedio", 2] } } },
   { $sort: { anio: 1, mes: 1 } }
 ]).forEach(printjson);
// Análisis: Enero y febrero tienen 3 experimentos cada uno, pero suman 135 y 360 min.
// La cantidad sola no muestra toda la carga de trabajo.
// Decisión: Filtro el año 2026 y agrupo por año y mes.

// 15. Reporte integral por experimento
dbLab.experimentos.aggregate([
   { $lookup: { from: "investigadores", localField: "investigadorId",
                foreignField: "_id", as: "investigador" } },
   { $unwind: { path: "$investigador", preserveNullAndEmptyArrays: true } },
   { $lookup: { from: "mediciones", localField: "_id",
                foreignField: "experimentoId", as: "mediciones" } },
   { $unwind: { path: "$mediciones", preserveNullAndEmptyArrays: true } },
   { $group: {
       _id: "$_id", nombre: { $first: "$nombre" },
       tipo: { $first: "$tipo" }, estado: { $first: "$estado" },
       fecha: { $first: "$fecha" }, duracion: { $first: "$duracion" },
       investigador: { $first: "$investigador.nombre" },
       cantidadMediciones: { $sum: { $cond: [
         { $ne: [{ $ifNull: ["$mediciones._id", null] }, null] }, 1, 0
       ] } },
       promedio: { $avg: "$mediciones.valor" },
       minimo: { $min: "$mediciones.valor" },
       maximo: { $max: "$mediciones.valor" }
   } },
   { $project: { _id: 0, identificador: "$_id", nombre: 1,
                 tipo: 1, estado: 1, fecha: 1, duracion: 1,
                 investigador: { $ifNull: ["$investigador", "No registrado"] },
                 cantidadMediciones: 1,
                 promedio: { $round: ["$promedio", 2] },
                 minimo: 1, maximo: 1 } },
   { $sort: { nombre: 1, identificador: 1 } }
 ]).forEach(printjson);
// Análisis: EXP001 tiene 4 mediciones, mientras EXP019 y EXP020 no tienen ninguna.
// Eso no permite juzgar su calidad; faltan objetivos, método y datos comparables.
// Decisión: Conservo experimentos sin mediciones y cuento solo las que existen.
