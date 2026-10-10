import React, { useEffect, useRef, useState } from 'react';
import { fetchTimeCheck } from '../utils/api';

// Бележка под датата и часа на раждане (Фаза 12): часовата зона на мястото и отместването на тази дата.
// Часът може да не съществува (прескочен при лятно време) или да се повтаря (върнат назад): тогава анализът не се
// пуска, докато човекът не го поправи или не избере първото или второто преминаване. Часът никога не се поправя тихо.
//
// onState({ blocking, zone }) казва на формата дали да спре изпращането и в коя зона е мястото.
// fold: null (няма избор), 0 или 1; onFold го сменя; onTime записва предложен валиден час.
// Формата сама нулира избора, когато човекът промени датата, часа или мястото (избор от профил го запазва).
export default function BirthMoment({ date, time, lat, lon, unknown = false, fold = null, onFold, onTime, onState, tone = 'purple' }) {
  const [stored, setStored] = useState(null);
  const [failed, setFailed] = useState(false);
  const seq = useRef(0);

  const latNum = Number.parseFloat(lat);
  const lonNum = Number.parseFloat(lon);
  const placeOk = Number.isFinite(latNum) && Number.isFinite(lonNum) && latNum >= -90 && latNum <= 90
    && lonNum >= -180 && lonNum <= 180;
  const ready = !unknown && Boolean(date) && Boolean(time) && placeOk;
  // При неизвестен час пак питаме за зоната (с пладне): тя е нужна за часовете в прогнозата, но не се показва тук
  const zoneOnly = unknown && Boolean(date) && placeOk;
  // Отговорът важи само за въпроса, на който е даден: при промяна на полетата старият не се показва
  const requestKey = `${date}|${ready ? time : '12:00'}|${latNum}|${lonNum}|${ready ? fold : null}`;
  const result = stored && stored.key === requestKey ? stored.data : null;

  useEffect(() => {
    if (!ready && !zoneOnly) {
      setStored(null);
      setFailed(false);
      return undefined;
    }
    const mine = ++seq.current;
    const timer = setTimeout(async () => {
      try {
        const data = await fetchTimeCheck({ date, time: ready ? time : '12:00', lat: latNum, lon: lonNum, fold: ready ? fold : null });
        if (mine !== seq.current) return;         // по-нова заявка е изпреварила тази
        setStored({ key: requestKey, data });
        setFailed(false);
      } catch {
        if (mine !== seq.current) return;
        setStored(null);
        setFailed(true);                          // без връзка: сървърът пак проверява при изпращане
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [ready, zoneOnly, date, time, latNum, lonNum, fold]);

  const blocking = ready && Boolean(result) && (result.status === 'nonexistent' || (result.status === 'ambiguous' && fold === null));
  useEffect(() => {
    if (onState) onState({ blocking, zone: (ready || zoneOnly) && result?.zone_found ? result.timezone : '' });
  }, [blocking, ready, zoneOnly, result]);

  if (unknown) {
    return (
      <p className="text-xs text-amber-200/90 -mt-2">
        Часът е неизвестен: няма да се показват Асцендент, MC и домове. Луната ще е с възможните си знаци, а планетите се смятат за 12:00 местно време.
      </p>
    );
  }
  if (!ready) return null;
  if (failed) return <p className="text-xs text-gray-400 -mt-2">Часовата зона не можа да се провери сега; ще бъде проверена при изпращане.</p>;
  if (!result) return <p className="text-xs text-gray-500 -mt-2">Проверка на часовата зона…</p>;

  const color = result.status === 'ok' && !result.at_sea ? 'text-gray-400' : 'text-amber-200';
  return (
    <div className="-mt-2 space-y-2" role="status">
      <p className={`text-xs ${color}`}>{result.message}</p>
      {result.status === 'nonexistent' && result.next_valid_time && onTime && (
        <button type="button" onClick={() => onTime(result.next_valid_time)}
          className="text-xs underline text-purple-300 hover:text-purple-200">
          Използвай {result.next_valid_time}
        </button>
      )}
      {result.options?.length > 0 && result.status !== 'nonexistent' && (
        <fieldset className="space-y-1">
          <legend className="sr-only">Кое преминаване на часа е вярното</legend>
          {result.options.map((option) => (
            <label key={option.fold} className="flex items-center gap-2 text-xs text-gray-200 cursor-pointer">
              <input type="radio" name={`fold-${tone}`} checked={fold === option.fold} onChange={() => onFold && onFold(option.fold)} />
              {option.label}
            </label>
          ))}
          {fold === null && <p className="text-xs text-red-300">Изберете преминаване, за да продължите.</p>}
        </fieldset>
      )}
    </div>
  );
}
