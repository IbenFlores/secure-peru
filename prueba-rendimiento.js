import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 100,         
  duration: '5m',   
};

const anios = ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026']; 
const niveles = ['departamento', 'provincia']; 
const modalidades = ['Hurto', 'Robo', 'Secuestros', 'Violencia contra la mujer e integrantes', 'Otros'];
const codigosPadre = ['04', '15', '08', '07', '21']; // Arequipa, Lima, Cusco, Callao, Puno

export default function () {
  const randomAnio = anios[Math.floor(Math.random() * anios.length)];
  const randomMod = modalidades[Math.floor(Math.random() * modalidades.length)];
  const randomNivel = niveles[Math.floor(Math.random() * niveles.length)];

  let url = `http://127.0.0.1:3000/api/mapa?nivel=${randomNivel}&anio=${randomAnio}&modalidad=${encodeURIComponent(randomMod)}`;

  // REGLA DE VALIDACIÓN: Si pedimos provincia, le adjuntamos un padre
  if (randomNivel === 'provincia') {
    const randomPadre = codigosPadre[Math.floor(Math.random() * codigosPadre.length)];
    url += `&padre=${randomPadre}`;
  }

  const res = http.get(url);

  check(res, {
    'estado es 200 (sin error)': (r) => r.status === 200,
  });

  sleep(1); 
}