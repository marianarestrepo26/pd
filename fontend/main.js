document.addEventListener('DOMContentLoaded', () => {
    loadbills();

    const billForm = document.getElementById('billForm');
    billForm.addEventListener('submit', handleFormSubmit);
});

async function loadbills() {
    try {
        const response = await fetch('http://localhost:3000/bill');
        const bills = await response.json();
        renderbillsTable(bills);
    } catch (error) {
        console.error('Error al cargar facturas:', error);
    }
}

function renderbillsTable(bills) {
    const tbody = document.getElementById('billsTableBody');
    tbody.innerHTML = ''; // Limpia la tabla
    
    bills.forEach(bill => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${bill.id}</td>
            <td>${bill.billing_period}</td>
            <td>$${bill.billd_amount}</td>
            <td>$${bill.paid_amount}</td>
            <td>${bill.client_id}</td>
            <td>
                <button class="btn btn-sm btn-warning" onclick="prepareModal('edit', ${bill.id})">
                    <i class="bi bi-pencil"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deletebill(${bill.id})">
                    <i class="bi bi-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function handleFormSubmit(event) {
    event.preventDefault();
    
    const billId = document.getElementById('billId').value;
    const billData = {
        billing_period: document.getElementById('billingPeriod').value,
        billd_amount: document.getElementById('billdAmount').value,
        paid_amount: document.getElementById('paidAmount').value,
        client_id: document.getElementById('clientId').value
    };

    const method = billId ? 'PUT' : 'POST';
    const url = billId ? `http://localhost:3000/api/bills/${billId}` : 'http://localhost:3000/api/bills';

    try {
        await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(billData)
        });
        
        const modal = bootstrap.Modal.getInstance(document.getElementById('billModal'));
        modal.hide();

        loadbills();
    } catch (error) {
        console.error('Error al guardar factura:', error);
    }
}

async function prepareModal(mode, id = null) {
    const modalLabel = document.getElementById('billModalLabel');
    const form = document.getElementById('billForm');
    
    form.reset();
    document.getElementById('billId').value = '';

    if (mode === 'create') {
        modalLabel.textContent = 'Crear Factura';
    } else if (mode === 'edit' && id) {
        modalLabel.textContent = 'Editar Factura';
        try {
            const response = await fetch(`http://localhost:3000/api/bills/${id}`);
            const bill = await response.json();
            
            document.getElementById('billId').value = bill.id;
            document.getElementById('billingPeriod').value = bill.billing_period;
            document.getElementById('billdAmount').value = bill.billd_amount;
            document.getElementById('paidAmount').value = bill.paid_amount;
            document.getElementById('clientId').value = bill.client_id;
        } catch (error) {
            console.error('Error al cargar datos para edición:', error);
        }
    }
}

async function deletebill(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar esta factura?')) {
        return;
    }

    try {
        await fetch(`http://localhost:3000/api/bills/${id}`, {
            method: 'DELETE'
        });
        loadbills();
    } catch (error) {
        console.error('Error al eliminar factura:', error);
    }
}