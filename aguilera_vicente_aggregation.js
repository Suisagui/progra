// Entrega: Aggregation Pipeline - laboratorio_universitario
// Ejecutar luego de cargar dataset_aggregation.js en MongoDB.
const dbLab = db.getSiblingDB("laboratorio_universitario");

// 1. Análisis de actividad experimental
printjson(
dbLab.experimentos.aggregate([
   { $match: { estado: { $in: ["finalizado", "pendiente"] }, duracion: { $gt: 60 } } },
   { $set: { duracionHoras: { $round: [{ $divide: ["$duracion", 60] }, 2] } } },
   { $sort: { fecha: -1, _id: 1 } },
   { $project: { _id: 0, nombre: 1, tipo: 1, estado: 1,
                 duracion: 1, duracionHoras: 1, fecha: 1 } },
   { $limit: 5 }
 ]).toArray()
);
// Los cancelados duran 25 y 35 min: incluirlos no cambia el filtro >60.
// El top 5 no representa todos los experimentos.

// 2. Clasificación y ranking de experimentos
printjson(
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
 ]).toArray()
);
// El ranking selecciona los puestos 4 a 8 de 13 finalizados.
// La duración sola no indica gasto: faltan costos, complejidad y recursos.

// 3. Distribución de experimentos por tipo y estado
printjson(
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
 ]).toArray()
);
// Hay 6 grupos con al menos 2 experimentos; otros 4 quedan excluidos.
// La distribución no demuestra relación causal entre tipo y estado.

// 4. Productividad por investigador
printjson(
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
 ]).toArray()
);
// Camila tiene 4 experimentos (330 min); Matías, 3 (355 min).
// La cantidad no demuestra mayor productividad: también importan estado y complejidad.
// Decisión: $lookup trae los nombres; partir de experimentos excluye investigadores sin actividad.

// 5. Trayectoria temporal de los investigadores
printjson(
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
 ]).toArray()
);
// Sebastián registra la fecha más reciente, pero solo un experimento.
// Una fecha reciente no demuestra continuidad; faltan hitos y periodos intermedios.
// Decisión: ordenar antes de $first/$last; $lookup recupera datos personales.

// 6. Análisis estadístico de mediciones
printjson(
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
 ]).toArray()
);
// Viabilidad: 4 mediciones, promedio 84; crecimiento: 11, promedio 9,01.
// Sin unidades y dispersión comparable, los promedios no bastan.

// 7. Análisis de observaciones de muestras
// Consulta A
printjson(
dbLab.muestras.aggregate([
   { $unwind: "$observaciones" },
   { $group: { _id: "$tipo", cantidadObservaciones: { $sum: 1 },
               listaObservaciones: { $push: "$observaciones" } } },
   { $project: { _id: 0, tipo: "$_id",
                 cantidadObservaciones: 1, listaObservaciones: 1 } },
   { $sort: { cantidadObservaciones: -1, tipo: 1 } }
 ]).toArray()
);
// Consulta B
printjson(
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
 ]).toArray()
);
// A cuenta 21 observaciones, pero las 12 muestras incluyen 3 sin observaciones.
// B conserva esas muestras; usar solo A subestima muestras disponibles.
// Decisión: preservar arreglos vacíos y agrupar antes por muestra evita duplicados.

// 8. Identificación de responsables ausentes
// Consulta A
printjson(
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
 ]).toArray()
);
// Consulta B
printjson(
dbLab.experimentos.aggregate([
   { $match: { responsable: null } },
   { $count: "cantidadSinResponsable" }
 ]).toArray()
);
// EXP010, EXP019 y EXP020 carecen de responsable registrado (3 casos).
// Los tres tienen investigadorId: falta de dato no prueba falta de supervisión.
// Decisión: responsable:null considera valor null o campo ausente.

// 9. Consulta integrada de experimentos e investigadores
printjson(
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
 ]).toArray()
);
// Existen 12 experimentos de las dos especialidades (6 por cada una).
// El límite de 10 excluye dos; no basta para comparar productividad.
// Decisión: relacionar por investigadorId y usar especialidades sin tilde, como en los datos.

// 10. Distribución por intervalos de duración
// Consulta A
printjson(
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
 ]).toArray()
);
// Consulta B
printjson(
dbLab.experimentos.aggregate([
   { $bucketAuto: {
       groupBy: "$duracion", buckets: 4,
       output: { cantidad: { $sum: 1 },
                 duracionPromedio: { $avg: "$duracion" } }
   } },
   { $project: { _id: 0, intervalo: "$_id", cantidad: 1,
                 duracionPromedio: { $round: ["$duracionPromedio", 2] } } },
   { $sort: { "intervalo.min": 1 } }
 ]).toArray()
);
// A registra 6 experimentos en el intervalo 30-59 minutos.
// A facilita comparaciones entre periodos; B cambia sus límites según los datos.

// 11. Reporte de finalizados y conteo total
// Consulta A
printjson(
dbLab.experimentos.aggregate([
   { $match: { estado: "finalizado" } },
   { $sort: { fecha: -1, _id: 1 } },
   { $skip: 5 },
   { $limit: 5 },
   { $project: { _id: 0, nombre: 1, tipo: 1, fecha: 1, duracion: 1 } }
 ]).toArray()
);
// Consulta B
printjson(
dbLab.experimentos.aggregate([
   { $match: { estado: "finalizado" } },
   { $count: "totalFinalizados" }
 ]).toArray()
);
// Hay 13 finalizados; la segunda página devuelve los puestos 6 a 10.
// Al ingresar registros nuevos, $skip puede repetir u omitir documentos.

// 12. Resumen de mediciones por experimento
printjson(
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
 ]).toArray()
);
// EXP006 tiene 4 mediciones, pero mezcla viabilidad y crecimiento.
// Más mediciones no garantizan mayor calidad; comparar variables requiere unidades.
// Decisión: $lookup aporta datos del experimento; partir de mediciones excluye los que no tienen registros.

// 13. Productividad de todos los investigadores
printjson(
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
 ]).toArray()
);
// A diferencia del ejercicio 4, aparecen los 9 investigadores, incluida Daniela (0).
// Cero registros no prueba baja productividad por sí solo.
// Decisión: conservar filas vacías y contar solo experimentos con _id.

// 14. Reporte mensual de actividad del laboratorio
printjson(
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
 ]).toArray()
);
// Marzo tiene 4 experimentos y 415 min; abril, 3 y 380 min.
// La cantidad no equivale a carga de trabajo: agosto suma 240 min en un caso.

// 15. Reporte integral por experimento
printjson(
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
 ]).toArray()
);
// EXP001 tiene 4 mediciones (promedio 8,6); EXP019 no registra mediciones.
// No es válido deducir calidad o continuidad solo con estos datos.
// Decisión: conservar relaciones vacías y reagrupar para evitar duplicados;
// EXP019 y EXP020 deben tener 0 mediciones y estadísticas null.