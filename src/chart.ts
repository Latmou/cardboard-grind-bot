import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ScoreRow } from './db';
import moment from 'moment';

const width = 800;
const height = 400;

const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour: '#181a1b' });

export async function generateRankChart(name: string, data: ScoreRow[], days: number, mode: 'rank' | 'rankScore' = 'rankScore') {
  if (data.length === 0) return Buffer.from([]);

  // 1. Organize existing data by hour (key: start of hour timestamp)
  const existingDataMap = new Map<number, ScoreRow>();
  for (const row of data) {
    const hourStart = moment.unix(row.timestamp).startOf('hour').unix();
    // Keep the last known score of the hour
    if (!existingDataMap.has(hourStart) || row.timestamp >= existingDataMap.get(hourStart)!.timestamp) {
      existingDataMap.set(hourStart, row);
    }
  }

  // 2. Determine the full range of hours requested
  const now = moment();
  const startHour = moment().subtract(days, 'days').startOf('hour');
  const endHour = now.startOf('hour');
  
  const filledData: { label: string, value: number }[] = [];
  const sortedExistingHours = Array.from(existingDataMap.keys()).sort((a, b) => a - b);

  let currentHour = moment(startHour);
  while (currentHour.isSameOrBefore(endHour)) {
    const currentUnix = currentHour.unix();
    let valueToUse: number;

    if (existingDataMap.has(currentUnix)) {
      valueToUse = mode === 'rankScore' ? existingDataMap.get(currentUnix)!.rankScore : existingDataMap.get(currentUnix)!.rank;
    } else {
      // Find the closest hour with data
      let closestHour = sortedExistingHours[0];
      let minDiff = Math.abs(currentUnix - closestHour);

      for (const h of sortedExistingHours) {
        const diff = Math.abs(currentUnix - h);
        if (diff < minDiff) {
          minDiff = diff;
          closestHour = h;
        } else if (diff > minDiff) {
          break;
        }
      }
      valueToUse = mode === 'rankScore' ? existingDataMap.get(closestHour)!.rankScore : existingDataMap.get(closestHour)!.rank;
    }

    filledData.push({
      label: currentHour.format('DD/MM HH:mm'),
      value: valueToUse
    });

    currentHour.add(1, 'hour');
  }

  // Calculate point radii: only if the value changes relative to the previous point
  const pointRadii = filledData.map((d, i) => {
    if (i === 0) return 3; // Always show the first point
    return d.value !== filledData[i - 1].value ? 3 : 0;
  });

  const valueLabel = mode === 'rankScore' ? 'Rank Score' : 'Rank';

  const configuration: any = {
    type: 'line',
    data: {
      labels: filledData.map(d => d.label),
      datasets: [
        {
          label: `${name}'s ${valueLabel}`,
          data: filledData.map(d => d.value),
          fill: false,
          borderColor: 'rgb(52, 152, 219)',
          backgroundColor: 'rgb(52, 152, 219)',
          tension: 0.1,
          pointRadius: pointRadii
        }
      ]
    },
    options: {
      plugins: {
        legend: {
          labels: {
            color: '#e8e6e3'
          }
        }
      },
      scales: {
        y: {
          reverse: mode === 'rank', // Reverse axis for rank (1 is top)
          beginAtZero: false,
          grid: {
            color: '#3c4143'
          },
          ticks: {
            color: '#e8e6e3',
            precision: 0
          },
          title: {
            display: true,
            text: valueLabel,
            color: '#e8e6e3'
          }
        },
        x: {
          grid: {
            color: '#3c4143'
          },
          ticks: {
            color: '#e8e6e3',
            autoSkip: true,
            maxTicksLimit: 10
          },
          title: {
            display: true,
            text: 'Date',
            color: '#e8e6e3'
          }
        }
      }
    }
  };

  return await chartJSNodeCanvas.renderToBuffer(configuration);
}
