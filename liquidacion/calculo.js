// ===== CONSTANTES =====
const SBU = 482;                     // Salario básico 2026
const MS_POR_DIA = 24 * 60 * 60 * 1000; // Milisegundos en un día

// ===== FUNCIONES DE FECHAS =====

// Convierte "2026-09-21" en una fecha. Usamos UTC para evitar
// errores de zona horaria (Ecuador está en UTC-5).
function leerFecha(texto) {
  const partes = texto.split("-");
  return new Date(Date.UTC(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2])));
}

// Días entre dos fechas, contando ambos extremos
function diasEntre(inicio, fin) {
  return Math.round((fin - inicio) / MS_POR_DIA) + 1;
}

// Suma años a una fecha (útil para encontrar aniversarios)
function sumarAnios(fecha, anios) {
  return new Date(Date.UTC(fecha.getUTCFullYear() + anios, fecha.getUTCMonth(), fecha.getUTCDate()));
}

// Cuenta cuántos aniversarios laborales se cumplieron hasta la salida
function aniosCompletos(ingreso, salida) {
  let anios = 0;
  while (sumarAnios(ingreso, anios + 1) <= salida) {
    anios++;
  }
  return anios;
}

// Encuentra el inicio del período más reciente (ej.: el último 1 de diciembre)
// mes: 0 = enero, 11 = diciembre
function inicioPeriodo(salida, mes, dia) {
  let inicio = new Date(Date.UTC(salida.getUTCFullYear(), mes, dia));
  if (inicio > salida) {
    inicio = new Date(Date.UTC(salida.getUTCFullYear() - 1, mes, dia));
  }
  return inicio;
}

// Días trabajados dentro de un período (máximo 360)
function diasEnPeriodo(inicioDelPeriodo, ingreso, salida) {
  const desde = ingreso > inicioDelPeriodo ? ingreso : inicioDelPeriodo;
  return Math.min(diasEntre(desde, salida), 360);
}

// ===== CÁLCULO PRINCIPAL =====

document.getElementById("calcular").addEventListener("click", function () {
  const resultado = document.getElementById("resultado");

  // 1. Leer los datos del formulario
  const textoIngreso = document.getElementById("ingreso").value;
  const textoSalida = document.getElementById("salida").value;
  const sueldo = Number(document.getElementById("sueldo").value);
  const mejorSueldo = Number(document.getElementById("mejorSueldo").value);
  const motivo = document.getElementById("motivo").value;
  const region = document.getElementById("region").value;
  const mensual13 = document.getElementById("mensual13").checked;
  const mensual14 = document.getElementById("mensual14").checked;

  // 2. Validar
  if (!textoIngreso || !textoSalida || sueldo <= 0) {
    resultado.className = "resultado error";
    resultado.textContent = "Completa las fechas y un sueldo mayor a 0.";
    return;
  }

  const ingreso = leerFecha(textoIngreso);
  const salida = leerFecha(textoSalida);

  if (ingreso > salida) {
    resultado.className = "resultado error";
    resultado.textContent = "La fecha de salida debe ser posterior a la de ingreso.";
    return;
  }

  // 3. Tiempo de servicio
  const completos = aniosCompletos(ingreso, salida);
  const ultimoAniversario = sumarAnios(ingreso, completos);
  const hayFraccion = ultimoAniversario < salida;
  const aniosConFraccion = completos + (hayFraccion ? 1 : 0);

  // 4. Calcular cada concepto
  const conceptos = [];

  if (motivo === "despido") {
    const base = Math.max(sueldo, mejorSueldo);
    const meses = aniosConFraccion <= 3 ? 3 : Math.min(aniosConFraccion, 25);
    conceptos.push({ nombre: "Indemnización por despido (" + meses + " sueldos)", valor: base * meses });
  }

  if ((motivo === "despido" || motivo === "renuncia") && completos > 0) {
    conceptos.push({ nombre: "Bonificación por desahucio (" + completos + " años × 25%)", valor: sueldo * 0.25 * completos });
  }

  if (!mensual13) {
    const dias13 = diasEnPeriodo(inicioPeriodo(salida, 11, 1), ingreso, salida);
    conceptos.push({ nombre: "Décimo tercero proporcional (" + dias13 + " días)", valor: sueldo * dias13 / 360 });
  }

  if (!mensual14) {
    const mesInicio = region === "sierra" ? 7 : 2; // 7 = agosto, 2 = marzo
    const dias14 = diasEnPeriodo(inicioPeriodo(salida, mesInicio, 1), ingreso, salida);
    conceptos.push({ nombre: "Décimo cuarto proporcional (" + dias14 + " días)", valor: SBU * dias14 / 360 });
  }

  const diasVacaciones = Math.min(diasEntre(ultimoAniversario, salida), 360);
  conceptos.push({ nombre: "Vacaciones proporcionales (" + diasVacaciones + " días)", valor: sueldo * diasVacaciones / 720 });

  // 5. Sumar el total
  let total = 0;
  for (const concepto of conceptos) {
    total = total + concepto.valor;
  }

  // 6. Mostrar el desglose como tabla
  let filas = "";
  for (const concepto of conceptos) {
    filas = filas + `<tr><td>${concepto.nombre}</td><td>$${concepto.valor.toFixed(2)}</td></tr>`;
  }

  resultado.className = "resultado";
  resultado.innerHTML = `
    <p>Tiempo de servicio: ${completos} años completos${hayFraccion ? " y una fracción" : ""}.</p>
    <table class="desglose">
      ${filas}
      <tr class="total"><td>Total estimado</td><td>$${total.toFixed(2)}</td></tr>
    </table>
  `;
});