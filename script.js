// Move libheif check to top immediately after DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    if (typeof libheif === 'undefined') {
        alert('Erro: Biblioteca libheif não carregada. Recarregue a página.');
        return;
    }

    const dropArea = document.getElementById('dropArea');
    const fileInput = document.getElementById('fileInput');
    const resultList = document.getElementById('resultList');
    const convertButton = document.getElementById('convertButton');
    const fileCounter = document.getElementById('fileCounter');

    // Estado global simplificado
    let selectedFiles = [];

    // Atualizar contador de arquivos
    function updateFileCounter() {
        fileCounter.textContent = selectedFiles.length;
        convertButton.disabled = selectedFiles.length === 0;
    }

    // Manipulação de arquivos
    function handleFileSelection(files) {
        selectedFiles = Array.from(files).filter(file => 
            file.name.match(/\.heic$/i) || 
            file.type === 'image/heic'
        );
        
        if (selectedFiles.length === 0) {
            alert('Selecione apenas arquivos HEIC/HEIF');
            return;
        }
        
        updateFileCounter();
    }

    // Eventos de Drag & Drop
    dropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropArea.classList.add('drag-over');
    });

    dropArea.addEventListener('dragleave', () => {
        dropArea.classList.remove('drag-over');
    });

    dropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        dropArea.classList.remove('drag-over');
        handleFileSelection(e.dataTransfer.files);
    });

    // Evento de seleção via input
    fileInput.addEventListener('change', (e) => {
        handleFileSelection(e.target.files);
        e.target.value = ''; // Reset para permitir nova seleção
    });

    // Conversão de arquivos
    // Modify the convert button click handler
    convertButton.addEventListener('click', async () => {
        if (selectedFiles.length === 0) return;
        
        resultList.innerHTML = '';
        const filesToConvert = [...selectedFiles];
        selectedFiles = [];
        
        for (const file of filesToConvert) {
            try {
                const pngData = await convertHEIC(file);
                createDownloadLink(file.name.replace(/\.heic$/i, '.png'), pngData);
            } catch (error) {
                createErrorItem(file.name, error.message);  // Now file is in scope
            }
        }
        
        updateFileCounter();
    });

    // Funções de conversão
    // Add at the top of the file
    if (typeof libheif === 'undefined') {
        alert('Erro: Biblioteca libheif não carregada. Recarregue a página.');
    }
    
    // Update the convertHEIC function error handling
    async function convertHEIC(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const decoder = new libheif.HeifDecoder();
                    const data = new Uint8Array(e.target.result);
                    
                    // Add validation for HEIF/HEIC files
                    if (!data || data.length === 0) {
                        reject('Arquivo vazio ou inválido');
                        return;
                    }
                    
                    const images = decoder.decode(data);
                    if (!images || images.length === 0) {
                        reject(new Error('Formato não suportado'));
                        return;
                    }
                    
                    const image = images[0];
                    resolve(await renderImage(image));
                } catch (error) {
                    console.error('Conversion error:', error);
                    reject(new Error(`Falha na conversão: ${error.message || error}`));
                }
            };
            reader.onerror = (error) => reject(new Error('Falha na leitura do arquivo'));
            reader.readAsArrayBuffer(file);
        });
    }
    
    // Fix renderImage error handling
    async function renderImage(image) {
        return new Promise((resolve, reject) => {
            // Get dimensions from HEIF metadata first
            const width = image.get_width();
            const height = image.get_height();
            
            image.display({
                data: new Uint8ClampedArray(width * height * 4),
                width: width,
                height: height,
                colorSpace: 'RGBA'
            }, (frame) => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = frame.width;
                    canvas.height = frame.height;
                    
                    const ctx = canvas.getContext('2d');
                    const imageData = new ImageData(
                        new Uint8ClampedArray(frame.data),
                        frame.width,  // Use frame's actual dimensions
                        frame.height
                    );
                    
                    ctx.putImageData(imageData, 0, 0);
                    resolve(canvas.toDataURL('image/png'));
                } catch (error) {
                    reject(new Error(`Render failed: ${error.message}`));
                }
            });
        });
    }

    // Funções de UI
    function createDownloadLink(filename, dataURL) {
        const item = document.createElement('div');
        item.className = 'result-item';
        item.innerHTML = `
            <div class="file-info">
                <a href="${dataURL}" download="${filename}" class="download-button" onclick="this.blur();">
                    Baixar PNG
                </a>
            </div>
        `;
        resultList.appendChild(item);
    }

    function createErrorItem(filename, error) {
        const item = document.createElement('div');
        item.className = 'result-item error';
        item.innerHTML = `
            <div class="file-info">
                <div class="file-name">${filename}</div>
                <div class="error-message">Erro: ${error}</div>
            </div>
        `;
        resultList.appendChild(item);
    }
});