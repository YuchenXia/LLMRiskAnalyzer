document.addEventListener('DOMContentLoaded', function() {
    // Section for Variable Declaration and Initialization
    let fmea_data = null; // Global variable to store FMEA data
    let userText = null;
    let sidebarContentHtml = `<strong>Generation Log</strong><br/>`


    fetchFMEAData();

    const sidebar = document.getElementById('aiGeneratedContentSidebar');
    const closeButton = document.getElementById('closeSidebar');
    const toggleButton = document.getElementById('toggleSidebar');


    // Section for Event Binding
    toggleButton.addEventListener('click', function() {
        sidebar.style.bottom = '0'; // Slide up to show
    });

    closeButton.addEventListener('click', function() {
        sidebar.style.bottom = '-100%'; // Slide down to hide
    });

    document.addEventListener('click', function(e) {
        if (!e.target.classList.contains('tooltip-item') && !e.target.closest('.tooltip')) {
            clearTooltips();
        }
    }, true);

    document.getElementById('downloadCSVButton').addEventListener('click', function() {
        fetch('/download_fmea_csv', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fmea_data)  // Send the current FMEA data as JSON
        })
        .then(response => {
            if (response.ok) return response.blob();
            throw new Error('Network response error.');
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'fmea_download.csv'; // Specify the file name for download
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        })
        .catch(error => console.error('Error downloading the file:', error));
    });


    document.getElementById('addNewEntryButton').addEventListener('click', function() {
        fetch('/add_entry', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(fmea_data)  // Send current FMEA data
        })
        .then(response => response.json())
        .then(updatedData => {
            fmea_data = updatedData; // Update global variable
            populateTable(updatedData.entries); // Repopulate the table
        })
        .catch(error => console.error('Error adding new entry:', error));
    });

    // Section for Function Definitions
    function fetchFMEAData() {
        fetch('/get_fmea_data')
            .then(response => response.json())
            .then(data => {
                fmea_data = data; // Store global data
                populateTable(data.entries);
            })
            .catch(error => console.error('Error fetching FMEA data:', error));
    }

    function populateTable(entries) {
        const tableBody = document.getElementById('fmeaTable').getElementsByTagName('tbody')[0];
        tableBody.innerHTML = '';

        entries.forEach((entry, index) => {
            const row = tableBody.insertRow();
            row.classList.add('normal-row');
            const operationCell = row.insertCell();
            operationCell.innerHTML = `<button class="editButton">Edit</button><button class="saveChange">Save</button><button class="cancelChange">Cancel</button>`;

            Object.keys(entry.cells).forEach(key => {
                const cell = row.insertCell();
                cell.textContent = entry.cells[key].value;
                cell.classList.add('cell-data');
            });

            setupEditButtons(row, entry, index);
        });
        colorTable()
    }

    function setupEditButtons(row, entry, index) {
        const editButton = row.querySelector('.editButton');
        const saveButton = row.querySelector('.saveChange');
        const cancelButton = row.querySelector('.cancelChange');

        saveButton.style.display = 'none';
        cancelButton.style.display = 'none';

        editButton.addEventListener('click', function() {
            toggleEdit(row, true);
        });

        saveButton.addEventListener('click', function() {
            saveChanges(row, index);
            toggleEdit(row, false);
        });

        cancelButton.addEventListener('click', function() {
            populateTable(fmea_data.entries); // Redraw the table to revert changes
        });
    }

    function toggleEdit(row, isEditing) {
        const displayState = isEditing ? 'none' : '';
        const editState = isEditing ? '' : 'none';

        row.querySelectorAll('.cell-data').forEach((cell, idx) => {
            if (isEditing) {
                const textarea = document.createElement('textarea');
                textarea.classList.add('editTextArea');
                textarea.value = cell.textContent;
                cell.textContent = '';
                cell.appendChild(textarea);

                // Add a right-click event listener to show tooltip
                textarea.addEventListener('contextmenu', function(event) {
                    event.preventDefault(); // Prevent the default context menu
                    userText = this.value;
                    showFirstLevelTooltip(textarea, row.rowIndex, idx); // Assuming rowIndex and idx (column index) are enough to find data
                });
            } else {
                const textarea = cell.querySelector('.editTextArea');
                cell.textContent = textarea ? textarea.value : cell.textContent;
                if (textarea) textarea.remove();
            }
        });

        row.querySelector('.editButton').style.display = displayState;
        row.querySelector('.saveChange').style.display = editState;
        row.querySelector('.cancelChange').style.display = editState;
    }

    function saveChanges(row, index) {
        const severity = parseFloat(row.cells[5].querySelector('.editTextArea').value) || 0;
        const occurrence = parseFloat(row.cells[7].querySelector('.editTextArea').value) || 0;
        const detection = parseFloat(row.cells[9].querySelector('.editTextArea').value) || 0;
        const rpn = severity * occurrence * detection;
        row.cells[10].querySelector('.editTextArea').value = rpn; // Update the textarea in case it's still in edit mode

        const textAreas = row.querySelectorAll('.editTextArea');

        textAreas.forEach((textarea, idx) => {
            const key = Object.keys(fmea_data.entries[index].cells)[idx];
            fmea_data.entries[index].cells[key].value = textarea.value;
        });
        fmea_data.entries[index].cells = fmea_data.entries[index].cells; // trigger data update if needed
        populateTable(fmea_data.entries); // Redraw the table to reflect changes
    }


    function colorTable() {
        const table = document.getElementById('fmeaTable');
        const rows = table.getElementsByTagName('tr');

        for (let i = 1; i < rows.length; i++) { // Start from 1 to skip header row
            const cells = rows[i].cells;

            // Apply coloring based on specific columns
            colorCell(cells[5], 'severity');
            colorCell(cells[7], 'occurrence');
            colorCell(cells[9], 'detection');
            colorCell(cells[10], 'rpn');
        }
    }

    function colorCell(cell, type) {
        const value = parseFloat(cell.textContent.trim()); // Convert text to number
        if (isNaN(value)) {cell.classList.add('gray-cell');return;}

        switch (type) {
            case 'severity':
            case 'occurrence':
            case 'detection':
                if (value > 0 && value < 3) {
                    cell.classList.add('green-cell');
                } else if (value >= 3 && value < 7) {
                    cell.classList.add('yellow-cell');
                } else if (value >= 7 && value <= 10) {
                    cell.classList.add('red-cell');
                } else {
                    cell.classList.add('gray-cell');
                }
                break;
            case 'rpn':
                if (value >= 100) {
                    cell.classList.add('red-cell');
                } else if (value >= 10) {
                    cell.classList.add('yellow-cell');
                } else if (value > 0){
                    cell.classList.add('green-cell');
                } else {
                    cell.classList.add('gray-cell');
                }
                break;
        }
    }



    function showFirstLevelTooltip(textarea, rowIndex, cellIndex) {
        clearTooltips();  // Clear any existing tooltips
        if (cellIndex === 0 || cellIndex === 4 || cellIndex === 6 || cellIndex === 8 || cellIndex === 9 || cellIndex === 12 || cellIndex === 13) {
            return;
        }
        const entry = fmea_data.entries[rowIndex - 1];
        const cellKey = Object.keys(entry.cells)[cellIndex];
        const cell = entry.cells[cellKey];
        const aiGeneratedContent = cell.aiGeneratedContent;

        // Retrieve all textareas from the same row and build the cells object
        const cellsData = {};
        const rowTextareas = textarea.closest('tr').querySelectorAll('.editTextArea');
        rowTextareas.forEach((area, idx) => {
            const key = Object.keys(entry.cells)[idx];
            cellsData[key] = area.value;
        });

        let tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        aiGeneratedContent.status = 'generating...';

        tooltip.innerHTML = `<strong>Status: ${aiGeneratedContent.status}</strong><br/>`;
        document.body.appendChild(tooltip);

        generateSuggestions(rowIndex - 1, cellKey, userText, cellsData, tooltip, textarea); // Always call this to handle status updates and suggestions

        tooltip.style.left = `${textarea.getBoundingClientRect().left}px`;
        tooltip.style.top = `${textarea.getBoundingClientRect().top + textarea.offsetHeight}px`;
        tooltip.classList.add('visible');
    }

    function populateTooltipWithSuggestions(tooltip, suggestions, textarea) {
        suggestions.forEach(suggestion => {
            let currentDate = new Date(); // Get the current date and time
            let timestamp = currentDate.toLocaleTimeString(); // Convert the time part of the date to a string with hours, minutes, and seconds
            sidebarContentHtml += `<p>${timestamp}: ${suggestion.content} - ${suggestion.reason}</p>`;
            const itemDiv = document.createElement('div');
            itemDiv.className = 'tooltip-item';
            itemDiv.textContent = suggestion.content;
            itemDiv.onclick = () => {
                textarea.value = suggestion.content;
            };

            document.querySelector('#aiGeneratedContentSidebar .sidebar-content').innerHTML = sidebarContentHtml;
            sidebar.style.bottom = '0';

            itemDiv.onmouseenter = () => showSecondLevelTooltip(itemDiv, suggestion);
            itemDiv.onmouseleave = hideSecondTooltip;

            tooltip.appendChild(itemDiv);

        });
    }

    function updateTooltipStatus(tooltip, status) {
        if (tooltip) {
            tooltip.querySelector('strong').textContent = `Status: ${status}`;
        }
    }

    function generateSuggestions(rowIndex, cellKey, userText, cellsData, tooltip, textarea) {
        const payload = { fmea_data, rowIndex, cellKey, userText, cellsData};
        const timeoutId = setTimeout(() => {
            updateTooltipStatus(tooltip, "server time out");
        }, 10000); // Set timeout to 10 seconds

        fetch('/generate_suggestions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP status ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            clearTimeout(timeoutId);
            fmea_data = data; // Update the global fmea_data
            const updatedContent = fmea_data.entries[rowIndex].cells[cellKey].aiGeneratedContent;
            updateTooltipStatus(tooltip, updatedContent.status);
            populateTooltipWithSuggestions(tooltip, updatedContent.suggestions, textarea);
        })
        .catch(error => {
            clearTimeout(timeoutId);
            updateTooltipStatus(tooltip, "error updating");
            console.error("Error updating data from the server:", error);
        });
    }


    function showSecondLevelTooltip(itemDiv, suggestion) {
        let secondTooltip = document.createElement('div');
        secondTooltip.className = 'second-tooltip';
        document.body.appendChild(secondTooltip);
        secondTooltip.innerHTML = `Recommendation: ${suggestion.reason} <br> Comment: ${suggestion.comment}`;

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

















    function updateTableWithNewRow(detailContent, cellIndex, rowIndex, tdElement) {
        // Update the frontend display and data model
        clearTooltips();

        // Send a POST request to the server to add a new row
        fetch('/add_content_in_the_new_row', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content: detailContent,
                cellIndex: cellIndex
            })
        })
        .then(response => response.json())
        .then(updatedData => {
            fmea_data = updatedData.table; // Assuming the backend returns the entire updated table
            clearTable();
            populateTable(fmea_data); // Re-populate table with new data
        })
        .catch(error => console.error('Error updating table with new row:', error));
    }


});
