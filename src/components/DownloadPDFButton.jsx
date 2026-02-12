import React, { useState } from 'react';
import { Loader2, FileText } from 'lucide-react';

// Български имена на планетите
const PLANET_NAMES = {
  Sun: 'Слънце',
  Moon: 'Луна',
  Mercury: 'Меркурий',
  Venus: 'Венера',
  Mars: 'Марс',
  Jupiter: 'Юпитер',
  Saturn: 'Сатурн',
  Uranus: 'Уран',
  Neptune: 'Нептун',
  Pluto: 'Плутон',
  Node: 'Възходящ Възел',
  Chiron: 'Хирон',
};

// Български имена на знаците
const SIGN_NAMES = {
  'Aries': 'Овен',
  'Taurus': 'Телец',
  'Gemini': 'Близнаци',
  'Cancer': 'Рак',
  'Leo': 'Лъв',
  'Virgo': 'Дева',
  'Libra': 'Везни',
  'Scorpio': 'Скорпион',
  'Sagittarius': 'Стрелец',
  'Capricorn': 'Козирог',
  'Aquarius': 'Водолей',
  'Pisces': 'Риби',
};

// Аспект имена
const ASPECT_NAMES = {
  'conjunction': 'съвпад',
  'sextile': 'секстил',
  'square': 'квадратура',
  'trine': 'тригон',
  'opposition': 'опозиция',
};

const DownloadPDFButton = ({ 
  targetId = 'report-content', 
  fileName = 'Astrology_Report.pdf', 
  natalChart = null, 
  natalAspects = null,
  monthlyResults = [], // for dynamic forecast (chunked monthly analysis)
  staticInterpretation = null // for static mode (single interpretation)
}) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Helper to extract input values
  const getInputValue = (name) => {
    const el = document.querySelector(`[name="${name}"]`);
    return el ? el.value : '';
  };

  const handleDownload = async () => {
    // Always generate DOCX for all reports
    await handleDOCXDownload();
    return;
    
    // OLD CODE - kept for reference but never executed
    const originalElement = document.getElementById(targetId);
    if (!originalElement) {
      alert('Грешка: Не е намерено съдържанието за експорт.');
      return;
    }

    setIsGenerating(true);

    try {
      // --- 1. CONFIGURATION ---
      const A4_WIDTH = 210; // mm
      const A4_HEIGHT = 297; // mm
      const MARGIN_TOP = 25; // 2.5cm top margin (approx 5 lines)
      const MARGIN_BOTTOM = 25; // 2.5cm bottom margin
      const CONTENT_HEIGHT = A4_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM; // Usable height
      
      const SANDBOX_WIDTH = 780; // px (Optimized for A4 width text wrapping)

      // --- 2. PREPARE FOOTER (Capture as Image to support Cyrillic) ---
      const footerContainer = document.createElement('div');
      footerContainer.style.position = 'absolute';
      footerContainer.style.top = '-10000px';
      footerContainer.style.width = `${SANDBOX_WIDTH}px`;
      footerContainer.style.textAlign = 'center';
      footerContainer.style.color = '#888888';
      footerContainer.style.fontFamily = 'Arial, sans-serif';
      footerContainer.style.fontSize = '12px';
      footerContainer.style.padding = '10px';
      footerContainer.style.backgroundColor = '#ffffff';
      
      const today = new Date().toLocaleDateString('bg-BG');
      footerContainer.innerHTML = `AstroApp AI &bull; Генерирано на ${today} &bull; Само за развлекателни цели`;
      
      document.body.appendChild(footerContainer);
      
      // Capture Footer as Image
      const footerCanvas = await html2canvas(footerContainer, { 
        scale: 2, 
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      const footerImgData = footerCanvas.toDataURL('image/png');
      const footerRatio = footerCanvas.width / footerCanvas.height;
      const footerPdfWidth = A4_WIDTH - 40; // 20mm margin each side
      const footerPdfHeight = footerPdfWidth / footerRatio;
      
      document.body.removeChild(footerContainer); // Cleanup

      // Helper function to add Cyrillic text (jsPDF doesn't support Cyrillic well)
      const addCyrillicText = (text, x, y, options = {}) => {
        const tempCanvas = document.createElement('canvas');
        const ctx = tempCanvas.getContext('2d');
        const fontSize = options.fontSize || 16;
        const width = options.width || 180;
        
        // Calculate canvas size based on text
        tempCanvas.width = width * 4; // Higher resolution
        tempCanvas.height = fontSize * 3;
        
        ctx.fillStyle = options.color || '#000000';
        ctx.font = `bold ${fontSize}px Arial, sans-serif`;
        ctx.textAlign = options.align === 'center' ? 'center' : 'left';
        ctx.textBaseline = 'middle';
        
        const textX = options.align === 'center' ? tempCanvas.width / 2 : fontSize;
        const textY = tempCanvas.height / 2;
        
        ctx.fillText(text, textX, textY);
        
        const textImg = tempCanvas.toDataURL('image/png');
        const imgWidthMM = width;
        const imgHeightMM = (tempCanvas.height * imgWidthMM) / tempCanvas.width;
        const imgX = options.align === 'center' ? (A4_WIDTH - imgWidthMM) / 2 : x;
        
        pdf.addImage(textImg, 'PNG', imgX, y - imgHeightMM/2, imgWidthMM, imgHeightMM);
      };

      // --- 2. CAPTURE DATA FOR COVER PAGE ---
      // Get name from input field - find input with placeholder containing "име"
      const nameInputs = document.querySelectorAll('input[type="text"]');
      let userName = 'Неизвестен';
      for (const input of nameInputs) {
        const placeholder = input.placeholder?.toLowerCase() || '';
        if (placeholder.includes('име') || placeholder.includes('name')) {
          userName = input.value?.trim() || 'Неизвестен';
          break;
        }
      }
      
      // Get city from select dropdown - find select element and get selected option text
      const selects = document.querySelectorAll('select');
      let selectedCityName = '';
      for (const select of selects) {
        // Check if this select is for city (has option with city names)
        const options = Array.from(select.options);
        if (options.length > 1 && options.some(opt => opt.text.includes('София') || opt.text.includes('Пловдив'))) {
          const selectedOption = options[select.selectedIndex];
          selectedCityName = selectedOption?.text?.trim() || selectedOption?.value?.trim() || '';
          break;
        }
      }
      
      // Get report type from selected button (button with bg-blue-600 class)
      const reportTypeButtons = document.querySelectorAll('button[type="button"]');
      let reportTypeText = 'Астрологичен Анализ';
      for (const button of reportTypeButtons) {
        if (button.classList.contains('bg-blue-600') || 
            button.classList.contains('border-blue-500')) {
          const labelSpan = button.querySelector('span.font-bold');
          if (labelSpan) {
            reportTypeText = labelSpan.innerText?.trim() || labelSpan.textContent?.trim() || 'Астрологичен Анализ';
            break;
          }
        }
      }
      
      const userData = {
        name: userName,
        date: getInputValue('date'),
        time: getInputValue('time'),
        city: selectedCityName,
        reportType: reportTypeText
      };

      // --- 3. PREPARE CONTENT (CLONE & STYLE) ---
      const sandbox = document.createElement('div');
      sandbox.style.position = 'absolute';
      sandbox.style.top = '-10000px';
      sandbox.style.left = '0';
      sandbox.style.width = `${SANDBOX_WIDTH}px`;
      sandbox.style.zIndex = '-1';
      document.body.appendChild(sandbox);

      const clonedElement = originalElement.cloneNode(true);
      
      // CLEANUP: Remove the Input Form Section
      // Strategy: Find the header "Въвеждане на данни" and remove its parent container
      const headings = clonedElement.querySelectorAll('h1, h2, h3, h4, div');
      headings.forEach(el => {
        if (el.innerText && el.innerText.includes('Въвеждане на данни')) {
          // Find the closest main container (card) and remove it
          const card = el.closest('.bg-white') || el.parentElement;
          if (card) card.remove();
        }
      });

      // Also remove any remaining inputs just in case
      const inputs = clonedElement.querySelectorAll('input, select');
      inputs.forEach(input => {
        const parent = input.closest('.grid') || input.parentElement;
        if (parent) parent.remove();
      });
      
      // Force "Word Document" Styles
      clonedElement.style.width = '100%';
      clonedElement.style.height = 'auto';
      clonedElement.style.backgroundColor = '#ffffff';
      clonedElement.style.color = '#000000';
      clonedElement.style.fontFamily = 'Georgia, serif'; // More readable for long text
      clonedElement.style.padding = '0px 40px'; // Side padding inside the capture
      
      // Clean up dark mode artifacts
      const allElements = clonedElement.querySelectorAll('*');
      allElements.forEach(el => {
         el.style.color = '#000000';
         el.style.borderColor = '#000000';
         if (window.getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)') {
             el.style.backgroundColor = '#ffffff';
         }
      });

      sandbox.appendChild(clonedElement);
      await new Promise(resolve => setTimeout(resolve, 800)); // Wait for render

      // --- 4. SNAPSHOT CONTENT ---
      const canvas = await html2canvas(clonedElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: SANDBOX_WIDTH,
        windowWidth: SANDBOX_WIDTH
      });

      const imgData = canvas.toDataURL('image/png');
      
      // --- 5. GENERATE PDF ---
      const pdf = new jsPDF('p', 'mm', 'a4');

      // === PAGE 1: COVER PAGE ===
      // Professional Title Page
      
      // Title (fontSize increased by 50%: 24 -> 36)
      addCyrillicText("АСТРОЛОГИЧЕН ДОКЛАД", 0, 25, { align: 'center', fontSize: 36, width: 180 });
      
      // Name (fontSize increased by 50%: 16 -> 24)
      addCyrillicText(`Подготвен за: ${userData.name}`, 0, 38, { align: 'center', fontSize: 24, width: 180 });
      
      // Date and Time (fontSize increased by 50%: 10 -> 15)
      addCyrillicText(`Дата на раждане: ${userData.date} в ${userData.time}`, 0, 48, { align: 'center', fontSize: 15, width: 180 });
      addCyrillicText(`Място: ${userData.city}`, 0, 56, { align: 'center', fontSize: 15, width: 180 });
      
      pdf.setDrawColor(0);
      pdf.line(20, 65, 190, 65); // Separator line

      // Report Type (fontSize increased by 50%: 9 -> 14)
      addCyrillicText(`Тип анализ: ${userData.reportType}`, 0, 72, { align: 'center', fontSize: 14, width: 180, color: '#646464' });
      
      // === CHART SUMMARY SECTION ===
      if (natalChart && natalChart.planets && natalChart.houses) {
        let yPos = 82;
        
        // Section 1: Planetary Positions (fontSize increased by 50%: 11 -> 17)
        addCyrillicText("1. ПЛАНЕТАРНИ ПОЗИЦИИ", 20, yPos, { align: 'left', fontSize: 17, width: 170, color: '#000000' });
        yPos += 12;
        
        // Helper to translate sign names
        const translateSign = (formattedPos) => {
          let translated = formattedPos;
          Object.entries(SIGN_NAMES).forEach(([engSign, bgSign]) => {
            const regex = new RegExp(engSign, 'gi');
            translated = translated.replace(regex, bgSign);
          });
          return translated;
        };
        
        // Group planets in two columns (left: 20-100mm, right: 105-185mm)
        const planets = Object.entries(natalChart.planets).filter(([_, data]) => data && data.formatted_pos);
        const midPoint = Math.ceil(planets.length / 2);
        
        planets.slice(0, midPoint).forEach(([planetName, planetData]) => {
          const planetNameBg = PLANET_NAMES[planetName] || planetName;
          const position = translateSign(planetData.formatted_pos);
          // fontSize increased by 50%: 8 -> 12
          addCyrillicText(`${planetNameBg}: ${position}`, 20, yPos, { align: 'left', fontSize: 12, width: 80 });
          yPos += 9;
        });
        
        // Add ASC if available
        if (natalChart.angles && natalChart.angles.Ascendant !== null && natalChart.angles.Ascendant !== undefined) {
          const ascFormatted = natalChart.angles.Ascendant_formatted || `${Math.floor(natalChart.angles.Ascendant)}°`;
          const ascTranslated = translateSign(ascFormatted);
          // fontSize increased by 50%: 8 -> 12
          addCyrillicText(`Асцендент: ${ascTranslated}`, 20, yPos, { align: 'left', fontSize: 12, width: 80 });
          yPos += 9;
        }
        
        // Right column for second half of planets
        yPos = 94;
        planets.slice(midPoint).forEach(([planetName, planetData]) => {
          const planetNameBg = PLANET_NAMES[planetName] || planetName;
          const position = translateSign(planetData.formatted_pos);
          // fontSize increased by 50%: 8 -> 12
          addCyrillicText(`${planetNameBg}: ${position}`, 105, yPos, { align: 'left', fontSize: 12, width: 80 });
          yPos += 9;
        });
        
        // Section 2: Houses
        yPos += 12;
        // fontSize increased by 50%: 11 -> 17
        addCyrillicText("2. ДОМОВЕ", 20, yPos, { align: 'left', fontSize: 17, width: 170, color: '#000000' });
        yPos += 12;
        
        // Group planets by house
        const planetsByHouse = {};
        Object.entries(natalChart.planets).forEach(([planetName, planetData]) => {
          if (!planetData || planetData.longitude === null || planetData.longitude === undefined) return;
          const houseNum = planetData.house !== undefined && planetData.house !== null 
            ? planetData.house 
            : 1; // Fallback
          if (!planetsByHouse[houseNum]) planetsByHouse[houseNum] = [];
          planetsByHouse[houseNum].push(planetName);
        });
        
        // Helper for house suffix
        const getHouseSuffix = (num) => {
          if (num === 1) return 'ви';
          if (num === 2) return 'ри';
          if (num === 3) return 'ти';
          if (num >= 4 && num <= 10) return 'ти';
          if (num === 11) return 'и';
          return 'ти';
        };
        
        // Display houses with planets (left column)
        let houseYPos = yPos;
        [1, 2, 3, 4, 5, 6].forEach(houseNum => {
          const planets = planetsByHouse[houseNum] || [];
          if (planets.length > 0) {
            const planetsList = planets.map(p => PLANET_NAMES[p] || p).join(', ');
            // fontSize increased by 50%: 8 -> 12
            addCyrillicText(`${houseNum}-${getHouseSuffix(houseNum)} дом: ${planetsList}`, 20, houseYPos, { align: 'left', fontSize: 12, width: 80 });
            houseYPos += 9;
          }
        });
        
        // Right column for houses 7-12
        houseYPos = yPos;
        [7, 8, 9, 10, 11, 12].forEach(houseNum => {
          const planets = planetsByHouse[houseNum] || [];
          if (planets.length > 0) {
            const planetsList = planets.map(p => PLANET_NAMES[p] || p).join(', ');
            // fontSize increased by 50%: 8 -> 12
            addCyrillicText(`${houseNum}-${getHouseSuffix(houseNum)} дом: ${planetsList}`, 105, houseYPos, { align: 'left', fontSize: 12, width: 80 });
            houseYPos += 9;
          }
        });
        
        // Section 3: Aspects (if available) - 3 columns layout
        if (natalAspects && natalAspects.length > 0) {
          yPos = Math.max(yPos, houseYPos) + 4; // Reduced spacing: was +12, now +4 (2 rows up = 16mm less, so 12-16 = -4, but we keep min 4mm)
          // fontSize increased by 50%: 11 -> 17
          addCyrillicText("3. АСПЕКТИ", 20, yPos, { align: 'left', fontSize: 17, width: 170, color: '#000000' });
          yPos += 12;
          
          // Calculate column widths (3 columns with small gaps)
          const colWidth = 55; // mm per column
          const col1X = 20;
          const col2X = 20 + colWidth + 5; // 5mm gap
          const col3X = 20 + (colWidth + 5) * 2;
          
          // Split aspects into 3 columns
          const aspectsPerCol = Math.ceil(natalAspects.length / 3);
          const col1Aspects = natalAspects.slice(0, aspectsPerCol);
          const col2Aspects = natalAspects.slice(aspectsPerCol, aspectsPerCol * 2);
          const col3Aspects = natalAspects.slice(aspectsPerCol * 2);
          
          // Find the maximum number of rows needed
          const maxRows = Math.max(col1Aspects.length, col2Aspects.length, col3Aspects.length);
          
          // Display aspects in 3 columns
          for (let i = 0; i < maxRows; i++) {
            let currentYPos = yPos + (i * 8); // 8mm spacing between rows
            
            // Column 1
            if (i < col1Aspects.length) {
              const aspect = col1Aspects[i];
              const planet1Name = PLANET_NAMES[aspect.planet1] || aspect.planet1;
              const planet2Name = PLANET_NAMES[aspect.planet2] || aspect.planet2;
              const aspectName = ASPECT_NAMES[aspect.aspect] || aspect.aspect;
              const aspectText = `${planet1Name} – ${planet2Name} ${aspectName}`;
              // fontSize increased by 50%: 8 -> 12
              addCyrillicText(aspectText, col1X, currentYPos, { align: 'left', fontSize: 12, width: colWidth });
            }
            
            // Column 2
            if (i < col2Aspects.length) {
              const aspect = col2Aspects[i];
              const planet1Name = PLANET_NAMES[aspect.planet1] || aspect.planet1;
              const planet2Name = PLANET_NAMES[aspect.planet2] || aspect.planet2;
              const aspectName = ASPECT_NAMES[aspect.aspect] || aspect.aspect;
              const aspectText = `${planet1Name} – ${planet2Name} ${aspectName}`;
              // fontSize increased by 50%: 8 -> 12
              addCyrillicText(aspectText, col2X, currentYPos, { align: 'left', fontSize: 12, width: colWidth });
            }
            
            // Column 3
            if (i < col3Aspects.length) {
              const aspect = col3Aspects[i];
              const planet1Name = PLANET_NAMES[aspect.planet1] || aspect.planet1;
              const planet2Name = PLANET_NAMES[aspect.planet2] || aspect.planet2;
              const aspectName = ASPECT_NAMES[aspect.aspect] || aspect.aspect;
              const aspectText = `${planet1Name} – ${planet2Name} ${aspectName}`;
              // fontSize increased by 50%: 8 -> 12
              addCyrillicText(aspectText, col3X, currentYPos, { align: 'left', fontSize: 12, width: colWidth });
            }
          }
        }
      }
      
      // Footer (fontSize increased by 50%: 9 -> 14)
      addCyrillicText("Генерирано от AstroApp AI", 0, 285, { align: 'center', fontSize: 14, width: 180 });

      // === PAGE 2+: CONTENT ===
      // Calculate dimensions
      const imgProps = pdf.getImageProperties(imgData);
      const pdfImgWidth = A4_WIDTH; // We use full width, but margins cover the sides effectively if needed
      const pdfImgHeight = (imgProps.height * pdfImgWidth) / imgProps.width;

      let heightLeft = pdfImgHeight;
      let position = 0; // Negative offset for the image
      let pageNumber = 2;

      // Start loop
      while (heightLeft > 0) {
        pdf.addPage(); // Always start content on Page 2
        
        // Place the LONG image. We shift it UP (negative Y) to reveal the next chunk.
        // We add MARGIN_TOP to push the start down.
        const yPos = MARGIN_TOP + position; 
        
        pdf.addImage(imgData, 'PNG', 0, yPos, pdfImgWidth, pdfImgHeight);

        // --- THE MASKING TRICK (Word Margins) ---
        pdf.setFillColor(255, 255, 255); // White
        
        // 1. Top Mask (Cover anything above the top margin)
        pdf.rect(0, 0, A4_WIDTH, MARGIN_TOP, 'F');
        
        // 2. Bottom Mask (Cover anything below the bottom margin)
        pdf.rect(0, A4_HEIGHT - MARGIN_BOTTOM, A4_WIDTH, MARGIN_BOTTOM, 'F');
        
        // Optional: Page Number in the footer (using Cyrillic helper)
        addCyrillicText(`Страница ${pageNumber}`, 0, 290, { align: 'center', fontSize: 9, width: 60, color: '#969696' });

        // ADD FOOTER IMAGE (Handles Cyrillic Perfectly)
        // Center the footer image at the bottom (y = 285mm)
        const footerX = (A4_WIDTH - footerPdfWidth) / 2;
        pdf.addImage(footerImgData, 'PNG', footerX, 285, footerPdfWidth, footerPdfHeight);

        heightLeft -= CONTENT_HEIGHT;
        position -= CONTENT_HEIGHT;
        pageNumber++;
      }

      // Cleanup
      document.body.removeChild(sandbox);
      pdf.save(fileName);

    } catch (error) {
      console.error('PDF Error:', error);
      alert('Грешка при генериране на PDF.');
    } finally {
      setIsGenerating(false);
    }
  };

  // NEW: DOCX generation for periods > 2 months (testing)
  const handleDOCXDownload = async () => {
    setIsGenerating(true);
    
    try {
      console.log('Starting DOCX generation...');
      console.log('Monthly results count:', monthlyResults.length);
      console.log('Static interpretation:', staticInterpretation ? 'Present' : 'None');
      
      // Prepare monthly_results: if static mode, wrap staticInterpretation as a single "month"
      let finalMonthlyResults = monthlyResults;
      if (monthlyResults.length === 0 && staticInterpretation) {
        console.log('Using static interpretation as single month');
        finalMonthlyResults = [
          {
            month: 'Анализ',
            text: staticInterpretation
          }
        ];
      }
      
      // Get user data
      const nameInputs = document.querySelectorAll('input[type="text"]');
      let userName = 'Неизвестен';
      for (const input of nameInputs) {
        const placeholder = input.placeholder?.toLowerCase() || '';
        if (placeholder.includes('име') || placeholder.includes('name')) {
          userName = input.value?.trim() || 'Неизвестен';
          break;
        }
      }
      
      const selects = document.querySelectorAll('select');
      let selectedCityName = '';
      for (const select of selects) {
        const options = Array.from(select.options);
        if (options.length > 1 && options.some(opt => opt.text.includes('София') || opt.text.includes('Пловдив'))) {
          const selectedOption = options[select.selectedIndex];
          selectedCityName = selectedOption?.text?.trim() || selectedOption?.value?.trim() || '';
          break;
        }
      }
      
      const reportTypeButtons = document.querySelectorAll('button[type="button"]');
      let reportTypeText = 'Астрологичен Анализ';
      for (const button of reportTypeButtons) {
        if (button.classList.contains('bg-blue-600') || 
            button.classList.contains('border-blue-500')) {
          const labelSpan = button.querySelector('span.font-bold');
          if (labelSpan) {
            reportTypeText = labelSpan.innerText?.trim() || labelSpan.textContent?.trim() || 'Астрологичен Анализ';
            break;
          }
        }
      }
      
      // Determine API base URL
      const API_BASE_URL = import.meta.env.MODE === 'development' 
        ? 'http://localhost:8000' 
        : 'https://astromind-api.onrender.com';
      
      console.log('API URL:', API_BASE_URL);
      console.log('Sending data:', {
        user_name: userName,
        birth_date: getInputValue('date'),
        birth_time: getInputValue('time'),
        birth_city: selectedCityName,
        report_type: reportTypeText,
        monthly_results_count: finalMonthlyResults.length
      });
      
      // Call backend to generate DOCX
      const response = await fetch(`${API_BASE_URL}/generate-docx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_name: userName,
          birth_date: getInputValue('date'),
          birth_time: getInputValue('time'),
          birth_city: selectedCityName,
          report_type: reportTypeText,
          natal_chart: natalChart,
          natal_aspects: natalAspects,
          monthly_results: finalMonthlyResults
        })
      });
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/';
          return;
        }
        const errorText = await response.text();
        console.error('Backend error:', errorText);
        throw new Error(`DOCX generation failed: ${errorText}`);
      }
      
      console.log('DOCX generated successfully');
      
      // Download the DOCX file
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName.replace('.pdf', '.docx');
      link.click();
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('DOCX Error:', error);
      console.error('Error details:', error.message);
      alert(`Грешка при генериране на DOCX: ${error.message}\n\nПроверете конзолата за повече детайли.`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Determine button text based on month count
  const getButtonText = () => {
    return 'Свали Доклад (DOCX)';
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isGenerating}
      className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-all flex justify-center items-center gap-2 disabled:opacity-50"
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Форматиране на документа...</span>
        </>
      ) : (
        <>
          <FileText className="w-5 h-5" />
          <span>{getButtonText()}</span>
        </>
      )}
    </button>
  );
};

export default DownloadPDFButton;
