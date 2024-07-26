document.addEventListener('DOMContentLoaded', function() {
    const table = document.getElementById('fmeaTable');
    const addButton = document.getElementById('addNewEntryButton');
    let fmea_data = {}; // 全局变量存储FMEA数据

    // 从服务器获取FMEA数据并初始化表格
    fetch('/get_fmea_data')
        .then(response => response.json())
        .then(data => {
            fmea_data = data.table;  // 保存获取的数据
            populateTable(fmea_data);
        })
        .catch(error => console.error('Error loading the FMEA data:', error));

    addButton.addEventListener('click', function() {
        addNewEntry();
    });

    function populateTable(data) {
        const tableBody = document.getElementById('fmeaTable').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = ''; // 清除既有内容
        data.rows.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');
            row.data.forEach((cell, cellIndex) => {
                const td = document.createElement('td');
                td.textContent = cell;
                td.onclick = () => fetchGeneratedDetailsFromServer(rowIndex, cellIndex, td); // 左键点击显示详细信息
                tr.appendChild(td);
            });
            tableBody.appendChild(tr);
        });
    }

    // 右键点击编辑单元格内容
    table.addEventListener('contextmenu', function(e) {
        e.preventDefault();  // 阻止默认的右键菜单
        if (e.target.tagName === 'TD') {
            makeEditable(e.target);
        }
    });

    function makeEditable(td) {
        let oldValue = td.textContent;
        let input = document.createElement('input');
        input.type = 'text';
        input.value = oldValue;
        input.style.width = '100%';
        td.innerHTML = '';
        td.appendChild(input);
        input.focus();

        // 失去焦点或按下Enter键时保存修改
        input.onblur = saveData;
        input.onkeypress = function(e) {
            if (e.key === 'Enter') {
                input.blur();
            }
        };

        function saveData() {
            let newValue = input.value;
            td.textContent = newValue; // 更新单元格显示
            let rowIndex = td.parentNode.rowIndex - 1; // 获取行索引
            let cellIndex = td.cellIndex; // 获取单元格索引
            // 更新全局变量中的数据
            fmea_data.rows[rowIndex].data[cellIndex] = newValue;
        }
    }

    function fetchGeneratedDetailsFromServer(rowIndex, cellIndex, tdElement) {
        fetch('/get_details', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ table: fmea_data, rowIndex: rowIndex, cellIndex: cellIndex })
        })
        .then(response => response.json())
        .then(details => {
            if (details.status && details.status === 'processing') {
                // Handling data processing notification
                showTemporaryTooltip(tdElement, "Generating...");
                pollForDetails(rowIndex, cellIndex, tdElement);  // Start polling for details
            } else {
                // Data is ready, display the first-level tooltip
                showFirstLevelTooltip(tdElement, details, rowIndex, cellIndex);
            }
        })
        .catch(error => console.error('Error fetching details:', error));
    }

    function showFirstLevelTooltip(tdElement, details, rowIndex, cellIndex) {
        clearTooltips();  // Clear any existing tooltips
        let tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        document.body.appendChild(tooltip);
        tooltip.innerHTML = '';

        details.forEach(detail => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'tooltip-item';
            itemDiv.textContent = detail.content;
            itemDiv.onclick = () => {
                updateTableWithNewRow(detail.content, cellIndex, rowIndex, tdElement);
            };

            itemDiv.onmouseenter = () => showSecondLevelTooltip(itemDiv, detail);
            itemDiv.onmouseleave = hideSecondTooltip;
            tooltip.appendChild(itemDiv);
        });

        tooltip.style.left = `${tdElement.getBoundingClientRect().left}px`;
        tooltip.style.top = `${tdElement.getBoundingClientRect().top + tdElement.offsetHeight}px`;
        tooltip.classList.add('visible');
    }

    function showSecondLevelTooltip(itemDiv, detail) {
        let secondTooltip = document.createElement('div');
        secondTooltip.className = 'second-tooltip';
        document.body.appendChild(secondTooltip);
        secondTooltip.innerHTML = `Recommendation: ${detail.reason},<br> Comment: ${detail.comment}`;

        secondTooltip.style.left = `${itemDiv.getBoundingClientRect().right + 10}px`;
        secondTooltip.style.top = `${itemDiv.getBoundingClientRect().top}px`;
        secondTooltip.classList.add('visible');
    }

    function hideSecondTooltip() {
        let secondTooltip = document.querySelector('.second-tooltip');
        if (secondTooltip) {
            secondTooltip.remove();
        }
    }

    function clearTooltips() {
        let tooltips = document.querySelectorAll('.tooltip, .second-tooltip');
        tooltips.forEach(tooltip => tooltip.remove());
    }

    function showTemporaryTooltip(tdElement, message) {
        clearTooltips();
        let tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        document.body.appendChild(tooltip);
        tooltip.textContent = message;

        tooltip.style.left = `${tdElement.getBoundingClientRect().left}px`;
        tooltip.style.top = `${tdElement.getBoundingClientRect().top + tdElement.offsetHeight}px`;
        tooltip.classList.add('visible');
    }

    function pollForDetails(rowIndex, cellIndex, tdElement, attempt = 1) {
        if (attempt > 20) {  // Stop polling after 20 attempts
            console.error("Maximum polling attempts reached, stopping further requests.");
            showTemporaryTooltip(tdElement, "Failed to load data after multiple attempts.");
            return;
        }

        setTimeout(() => {
            fetch('/get_details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ table: fmea_data, rowIndex: rowIndex, cellIndex: cellIndex })
            })
            .then(response => response.json())
            .then(details => {
                if (details.status && details.status === 'processing') {
                    // If still processing, continue polling
                    pollForDetails(rowIndex, cellIndex, tdElement, attempt + 1);
                } else {
                    // Data is ready, display the first-level tooltip
                    showFirstLevelTooltip(tdElement, details, rowIndex, cellIndex);
                }
            })
            .catch(error => {
                console.error('Polling error:', error);
                showTemporaryTooltip(tdElement, "Error fetching data.");
            });
        }, 500); // Poll every 0.5 seconds
    }




    function addNewEntry() {
        // 创建一个新的空白行数据结构
        const newRow = {
            data: Array(fmea_data.rows[0].data.length).fill('') // 假设每行都有相同的列数
        };

        // 添加到全局数据变量
        fmea_data.rows.push(newRow);

        // 更新表格
        populateTable(fmea_data);
    }
});
