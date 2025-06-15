document.addEventListener('DOMContentLoaded', () => {
    // ======================================================================
    // ==                           1. GLOBAL SETUP                        ==
    // ======================================================================
    const getEl = (id) => document.getElementById(id);

    const appContainer = getEl('app-container');
    const loginScreen = getEl('login-screen');

    const appScreens = {
        dashboard: getEl('dashboard-screen'), projects: getEl('projects-screen'),
        workCodes: getEl('work-codes-screen'), dailyActivities: getEl('daily-activities-screen'),
        personnel: getEl('personnel-screen'), cardSwipes: getEl('card-swipes-screen'),
        planning: getEl('planning-screen'), planningCharts: getEl('planning-charts-screen'),
        placeholder: getEl('placeholder-screen')
    };
    
    // Genel Elementler
    const loginForm = getEl('login-form'), logoutButton = getEl('logout-button');
    const userIdDisplay = getEl('user-id-display'), userAvatar = getEl('user-avatar');
    const infoModal = getEl('info-modal'), modalMessage = getEl('modal-message'), modalCloseButton = getEl('modal-close-button');
    const sidebarToggle = getEl('sidebar-toggle'), expandAllBtn = getEl('expand-all-btn'), collapseAllBtn = getEl('collapse-all-btn'), mainMenu = getEl('main-menu');

    // Form Modal Elementleri
    const formModal = getEl('form-modal');
    const formModalContent = getEl('form-modal-content');
    const formModalTitle = getEl('form-modal-title');
    const formModalBody = getEl('form-modal-body');
    const formModalCancelBtn = getEl('modal-cancel-btn');
    const formModalSaveBtn = getEl('modal-save-btn');
    
    // Durum Değişkenleri
    let isLoggedIn = false, currentUserName = null, ganttChartView = 'daily', activeCharts = [];
    let currentPlanItems = [], ganttMinDate, ganttMaxDate;
    let allActivities = []; // Tarih filtresi için

    // ======================================================================
    // ==         2. GÖRSEL İYİLEŞTİRME VE ANİMASYON STİLLERİ              ==
    // ======================================================================
    function injectModalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInUp {
                from { opacity: 0; transform: translate3d(0, 30px, 0) scale(0.95); }
                to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
            }
            @keyframes fadeOutDown {
                from { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
                to { opacity: 0; transform: translate3d(0, 20px, 0) scale(0.95); }
            }
            #form-modal-content {
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
                border: 1px solid #e0e0e0;
                transition: transform 0.3s ease, opacity 0.3s ease;
            }
            .modal-entering #form-modal-content {
                animation: fadeInUp 0.3s ease forwards;
            }
            .modal-leaving #form-modal-content {
                animation: fadeOutDown 0.3s ease forwards;
            }
        `;
        document.head.appendChild(style);
    }
    
    // ======================================================================
    // ==                  3. HELPER & UTILITY FUNCTIONS                   ==
    // ======================================================================
    function showInfoModal(message, isSuccess = true) {
        infoModal.style.display = 'flex';
        infoModal.style.alignItems = 'center';
        infoModal.style.justifyContent = 'center';
        modalMessage.textContent = message;
        infoModal.classList.remove('hidden');
    }
    function authenticatedFetch(url, options = {}) { options.credentials = 'include'; return fetch(url, options); }
    async function populateDropdown(selectElement, url, valueField, textField, prompt, filter = null, selectedValue = null) {
        try { if (!selectElement) return; const finalUrl = filter ? `${url}?${filter.key}=${filter.value}` : url; const response = await authenticatedFetch(finalUrl); const result = await response.json(); if (result.success) { selectElement.innerHTML = `<option value="">-- ${prompt} --</option>`; result.data.forEach(item => { const option = document.createElement('option'); option.value = item[valueField]; option.textContent = Array.isArray(textField) ? textField.map(f => item[f]).join(' ') : item[textField]; if (item[valueField] == selectedValue) option.selected = true; selectElement.appendChild(option); }); } } catch (error) { console.error(`Dropdown doldurulamadı (${url}):`, error); }
    }
    
    // ======================================================================
    // ==                    4. AUTH & VIEW MANAGEMENT                     ==
    // ======================================================================
    function showApp(user) { isLoggedIn = true; currentUserName = user.userName; userIdDisplay.textContent = currentUserName; userAvatar.textContent = currentUserName.charAt(0).toUpperCase(); loginScreen.classList.add('hidden'); appContainer.classList.remove('hidden'); }
    function showLogin() { isLoggedIn = false; currentUserName = null; loginScreen.classList.remove('hidden'); appContainer.classList.add('hidden'); }

    // ======================================================================
    // ==                    5. SIDEBAR & MENU LOGIC                       ==
    // ======================================================================
    function openAllSubmenus() { mainMenu.querySelectorAll('.has-submenu').forEach(li => li.classList.add('open')); }
    function closeAllSubmenus() { mainMenu.querySelectorAll('.has-submenu').forEach(li => li.classList.remove('open')); }
    function setActiveMenuItem(pageName) {
        mainMenu.querySelectorAll('li,a').forEach(el=>el.classList.remove('active'));
        const link=mainMenu.querySelector(`a[data-page='${pageName}']`);
        if(link){link.classList.add('active'); const li=link.closest('li'); if(li)li.classList.add('active'); const sub=link.closest('.has-submenu'); if(sub){sub.classList.add('active');if(!sub.classList.contains('open'))sub.classList.add('open');}}
    }
    
    // ======================================================================
    // ==                6. DYNAMIC MODAL & FORM MANAGEMENT              ==
    // ======================================================================
    function showFormModal(title, formHtml, submitCallback) {
        formModalTitle.textContent = title;
        formModalBody.innerHTML = `<form id="dynamic-form">${formHtml}</form>`;
        const form = getEl('dynamic-form');
        const saveHandler = (e) => { e.preventDefault(); submitCallback(new FormData(form)); hideFormModal(); };
        form.addEventListener('submit', saveHandler);
        formModalSaveBtn.onclick = () => form.dispatchEvent(new Event('submit', {cancelable: true, bubbles: true}));
        formModal.classList.add('modal-entering');
        formModal.classList.remove('hidden');
    }
    function hideFormModal() {
        formModal.classList.add('modal-leaving');
        formModal.classList.remove('modal-entering');
        setTimeout(() => {
            formModal.classList.add('hidden');
            formModal.classList.remove('modal-leaving');
            formModalTitle.textContent = '';
            formModalBody.innerHTML = '';
            formModalSaveBtn.onclick = null;
        }, 300);
    }
    function getWorkCodeFormHtml(item={}) { return `<div class="mb-4"><label class="block">İş Kodu:</label><input type="text" name="code" class="w-full" value="${item.code||''}" required></div><div><label class="block">Açıklama:</label><textarea name="description" class="w-full" rows="3" required>${item.description||''}</textarea></div><input type="hidden" name="id" value="${item.id||''}">`; }
    function getDailyActivityFormHtml(item={}) { return `<div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label class="block">Proje:</label><select name="projectId" class="w-full" required></select></div><div><label class="block">İş Kodu:</label><select name="workCodeId" class="w-full" required></select></div><div><label class="block">Tarih:</label><input type="date" name="date" class="w-full" value="${item.date||new Date().toISOString().split('T')[0]}" required></div><div><label class="block">Çalışılan Saat:</label><input type="number" name="hoursWorked" step="0.1" class="w-full" value="${item.hours_worked||''}" required></div><div class="md:col-span-2"><label class="block">Ek Açıklama:</label><textarea name="description" class="w-full" rows="2">${item.description||''}</textarea></div><div class="md:col-span-2"><label class="block">Kullanılan Malzemeler:</label><textarea name="materialsUsed" class="w-full" rows="2">${item.materials_used||''}</textarea></div></div><input type="hidden" name="id" value="${item.id||''}">`; }
    function getEmployeeFormHtml(item={}) { return `<div class="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label>Ad:</label><input type="text" name="firstName" class="w-full" value="${item.first_name||''}" required></div><div><label>Soyad:</label><input type="text" name="lastName" class="w-full" value="${item.last_name||''}" required></div><div><label>Departman:</label><select id="form-department-select" name="departmentId" class="w-full" required></select></div><div><label>Pozisyon:</label><select id="form-position-select" name="positionId" class="w-full" required></select></div><div><label>İşe Başlama Tarihi:</label><input type="date" name="startDate" class="w-full" value="${item.start_date||''}" required></div><div><label>Doğum Tarihi:</label><input type="date" name="dateOfBirth" class="w-full" value="${item.date_of_birth||''}"></div><div><label>Cinsiyet:</label><select name="gender" class="w-full" required><option value="">Seçiniz</option><option value="Erkek" ${item.gender==='Erkek'?'selected':''}>Erkek</option><option value="Kadın" ${item.gender==='Kadın'?'selected':''}>Kadın</option></select></div><div><label>Uyruk:</label><input type="text" name="nationality" class="w-full" value="${item.nationality||''}"></div><div><label>Telefon:</label><input type="tel" name="phone" class="w-full" value="${item.phone||''}"></div><div><label>E-posta:</label><input type="email" name="email" class="w-full" value="${item.email||''}"></div><div class="md:col-span-2"><label>Adres:</label><textarea name="address" class="w-full" rows="2">${item.address||''}</textarea></div></div><input type="hidden" name="id" value="${item.id||''}">`; }

    // ======================================================================
    // ==                 7. CRUD & API SUBMIT HANDLERS                    ==
    // ======================================================================
    async function handleApiSubmit(url, method, formData, successCallback) { try { const response = await authenticatedFetch(url, { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(Object.fromEntries(formData.entries())) }); const result = await response.json(); showInfoModal(result.message, result.success); if(result.success) successCallback(); } catch (error) { showInfoModal('Ağ hatası: ' + error.message, false); } }
    const handleWorkCodeSubmit = (formData) => handleApiSubmit(`api/work_codes.php${formData.get('id')?`?id=${formData.get('id')}`:''}`, formData.get('id')?'PUT':'POST', formData, loadWorkCodesPage);
    const handleDailyActivitySubmit = (formData) => handleApiSubmit(`api/daily_activities.php${formData.get('id')?`?id=${formData.get('id')}`:''}`, formData.get('id')?'PUT':'POST', formData, loadDailyActivitiesPage);
    const handleEmployeeSubmit = (formData) => handleApiSubmit(`api/employees.php${formData.get('id')?`?id=${formData.get('id')}`:''}`, formData.get('id')?'PUT':'POST', formData, loadPersonnelPage);
    async function deleteItem(module, id, successCallback) { if (!confirm('Bu kaydı silmek istediğinizden emin misiniz?')) return; try { const response = await authenticatedFetch(`api/${module}.php?id=${id}`, { method: 'DELETE' }); const result = await response.json(); showInfoModal(result.message, result.success); if(result.success) successCallback(); } catch(error) { showInfoModal('Silme hatası: ' + error.message, false); } }
    
    // ======================================================================
    // ==                  8. PAGE LOADERS & RENDERERS                     ==
    // ======================================================================
    function destroyActiveCharts() { activeCharts.forEach(chart => chart.destroy()); activeCharts = []; }
    function loadPlaceholderPage(title='...') { destroyActiveCharts(); appScreens.placeholder.innerHTML = `<div class="main-content-area"><h2 class="text-3xl font-bold text-blue-700">${title}</h2><p>Bu modül yapım aşamasındadır.</p></div>`; }
    function loadDashboard() { destroyActiveCharts(); appScreens.dashboard.innerHTML = `<div class="main-content-area"><h2 class="text-3xl font-bold text-blue-700 mb-8">Kontrol Paneli</h2><p class="text-center text-gray-600">Hoş geldiniz, ${currentUserName}.</p></div>`; }
    
    function renderTableRows(data, columns, module) {
        return data.map(item=>`<tr data-item='${JSON.stringify(item)}'> ${columns.map(c=>`<td class="p-4">${c.render?c.render(item[c.key],item):(item[c.key]||'N/A')}</td>`).join('')} ${module?`<td class="p-4 space-x-2"><button class="edit-btn text-white bg-blue-600 hover:bg-blue-700 p-2 rounded text-sm" data-module="${module}">Düzenle</button><button class="delete-btn text-white bg-red-500 hover:bg-red-600 p-2 rounded text-sm" data-id="${item.id}" data-module="${module}">Sil</button></td>`:''} </tr>`).join('');
    }
    function renderGenericTable({title, module, data, columns, filterHtml = ''}) {
        const canAdd = module ? `<button class="add-btn bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg" data-module="${module}">Yeni Kayıt Ekle</button>` : '';
        const headerControls = filterHtml ? `<div class="flex items-center space-x-4">${filterHtml}${canAdd}</div>` : canAdd;
        return `<div class="main-content-area-full" data-module="${module||''}"> <div class="flex justify-between items-center mb-4"><h2 class="text-3xl font-bold text-blue-700">${title}</h2>${headerControls}</div> <div class="overflow-x-auto bg-white rounded-lg shadow"><table class="min-w-full"><thead class="bg-gray-50"><tr> ${columns.map(c=>`<th class="p-4 text-left">${c.header}</th>`).join('')} ${module?`<th class="p-4 text-left">İşlemler</th>`:''} </tr></thead><tbody id="${module}-table-body">${renderTableRows(data, columns, module)}</tbody></table></div></div>`;
    }
    async function loadPageWithData(screen, url, options) {
        destroyActiveCharts();
        screen.innerHTML = `<div class="main-content-area-full"><p>Yükleniyor...</p></div>`;
        try {
            const response = await authenticatedFetch(url);
            const result = await response.json();
            screen.innerHTML = result.success ? renderGenericTable({ ...options, data: result.data }) : `<p class="text-red-500">${options.title} yüklenemedi: ${result.message}</p>`;
        } catch (error) { screen.innerHTML = `<p class="text-red-500">Hata: ${error.message}</p>`; }
    }
    
    const loadProjectsPage = () => loadPageWithData(appScreens.projects, 'api/projects.php', { title: 'Projeler', columns: [{header:'Proje Adı',key:'name'},{header:'Kod',key:'code'},{header:'Lokasyon',key:'location'},{header:'Bütçe',key:'budget',render:(v)=>Number(v).toLocaleString('tr-TR',{style:'currency',currency:'TRY'})}] });
    const loadWorkCodesPage = () => loadPageWithData(appScreens.workCodes, 'api/work_codes.php', { title: 'İş Kodları', module: 'work_codes', columns: [{header:'Kod',key:'code'},{header:'Açıklama',key:'description'}] });
    const loadPersonnelPage = () => loadPageWithData(appScreens.personnel, 'api/employees.php', { title: 'Personel Listesi', module: 'employees', columns: [{header:'Ad Soyad',key:'first_name',render:(v,r)=>`${r.first_name} ${r.last_name}`},{header:'Departman',key:'department_name'},{header:'Pozisyon',key:'position_name'},{header:'İşe Başlama',key:'start_date',render:(v)=>new Date(v).toLocaleDateString('tr-TR')}] });
    const loadCardSwipesPage = () => loadPageWithData(appScreens.cardSwipes, 'api/card_swipes.php', { title: 'Puantaj & Devam Takip', columns: [{header:'Personel', key:'employee_first_name', render:(v,r)=>`${r.employee_first_name} ${r.employee_last_name}`}, {header:'Zaman', key:'swipe_time', render:(v)=>new Date(v).toLocaleString('tr-TR')}, {header:'Tip', key:'swipe_type'}, {header:'Cihaz', key:'device_id'}] });
    
    async function loadDailyActivitiesPage() {
        destroyActiveCharts();
        const screen = appScreens.dailyActivities;
        screen.innerHTML = `<div class="main-content-area-full"><p>Yükleniyor...</p></div>`;
        try {
            const response = await authenticatedFetch('api/daily_activities.php');
            const result = await response.json();
            if (result.success) {
                allActivities = result.data;
                const uniqueDates = [...new Set(allActivities.map(a => a.date))].sort((a,b) => new Date(b) - new Date(a));
                const filterHtml = `<div class="flex items-center space-x-2"><label for="date-filter" class="text-sm font-medium">Tarih:</label><select id="date-filter" class="rounded-md border-gray-300 shadow-sm"><option value="all">Tüm Tarihler</option>${uniqueDates.map(date => `<option value="${date}">${new Date(date).toLocaleDateString('tr-TR')}</option>`).join('')}</select></div>`;
                const tableOptions = { title: 'Günlük Raporlar', module: 'daily_activities', data: allActivities, columns: [{header:'Tarih',key:'date',render:(v)=>new Date(v).toLocaleDateString('tr-TR')},{header:'Proje',key:'project_name'},{header:'İş Kodu',key:'work_code_code'},{header:'Açıklama',key:'description'},{header:'Süre',key:'hours_worked',render:(v)=>`${v} sa`}], filterHtml: filterHtml };
                screen.innerHTML = renderGenericTable(tableOptions);
            } else { screen.innerHTML = `<p class="text-red-500">Raporlar yüklenemedi: ${result.message}</p>`; }
        } catch (error) { screen.innerHTML = `<p class="text-red-500">Hata: ${error.message}</p>`; }
    }
    async function loadPlanningPage() { /* ... */ } function renderGanttChart() { /* ... */ } function drawGanttTimeScale() { /* ... */ } async function loadPlanningChartsPage() { /* ... */ }

    // ======================================================================
    // ==                    9. PAGE ROUTING & MANAGEMENT                  ==
    // ======================================================================
    const pageLoaders = { dashboard: loadDashboard, projects: loadProjectsPage, workCodes: loadWorkCodesPage, dailyActivities: loadDailyActivitiesPage, personnel: loadPersonnelPage, cardSwipes: loadCardSwipesPage, planning: loadPlanningPage, planningCharts: () => loadPlaceholderPage("Grafikler"), placeholder: (p) => loadPlaceholderPage(p.title) };
    function showPage(pageName, params = null) { Object.values(appScreens).forEach(screen => screen&&screen.classList.add('hidden')); if (!isLoggedIn) { showLogin(); return; } const screenToShow = appScreens[pageName]; if (screenToShow) screenToShow.classList.remove('hidden'); setActiveMenuItem(pageName); const pageLoader = pageLoaders[pageName]; if (pageLoader) pageLoader(params); }
    
    // ======================================================================
    // ==                10. EVENT LISTENERS & INITIALIZATION              ==
    // ======================================================================
    function showApplication(userData) { if (!isLoggedIn) { showApp(userData); openAllSubmenus(); showPage('dashboard'); } }
    async function handleLogin(e) { if(e) e.preventDefault(); try { const r=await authenticatedFetch('api/auth.php', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username:getEl('username').value,password:getEl('password').value})}); const d=await r.json(); if(d.success) showApplication(d.data); else showInfoModal(`Giriş başarısız: ${d.message}`, false); } catch (err) { showInfoModal(`Ağ hatası: ${err.message}`, false); } }
    async function handleLogout() { await authenticatedFetch('api/auth.php?action=logout', { method: 'POST' }); document.cookie = "PHPSESSID=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"; isLoggedIn = false; showLogin(); }
    async function checkAuthStatus() { try { const r=await authenticatedFetch('api/auth_check.php'); const d=await r.json(); if (d.success) showApplication(d.data); else showLogin(); } catch(e) { console.error("Oturum kontrolü hatası", e); showLogin(); } }
    
    function setupEventListeners() {
        modalCloseButton.addEventListener('click', () => infoModal.classList.add('hidden'));
        formModalCancelBtn.addEventListener('click', () => hideFormModal());
        sidebarToggle.addEventListener('click', () => appContainer.classList.toggle('sidebar-collapsed'));
        expandAllBtn.addEventListener('click', openAllSubmenus);
        collapseAllBtn.addEventListener('click', closeAllSubmenus);
        loginForm.addEventListener('submit', handleLogin);
        logoutButton.addEventListener('click', handleLogout);
        mainMenu.addEventListener('click', (e) => { const link = e.target.closest('a'); if (!link) return; const parentLi = link.parentElement; if (parentLi.classList.contains('has-submenu') && link.querySelector('.chevron')) { e.preventDefault(); if(appContainer.classList.contains('sidebar-collapsed')) appContainer.classList.remove('sidebar-collapsed'); parentLi.classList.toggle('open'); } else if (link.dataset.page) { e.preventDefault(); showPage(link.dataset.page, { title: link.dataset.title }); } });

        document.getElementById('main-content').addEventListener('change', (e) => {
            if (e.target.id === 'date-filter') {
                const selectedDate = e.target.value;
                const activitiesToShow = selectedDate === 'all' ? allActivities : allActivities.filter(a => a.date === selectedDate);
                const tableBody = getEl('daily_activities-table-body');
                if(tableBody) tableBody.innerHTML = renderTableRows(activitiesToShow, [{header:'Tarih',key:'date',render:(v)=>new Date(v).toLocaleDateString('tr-TR')},{header:'Proje',key:'project_name'},{header:'İş Kodu',key:'work_code_code'},{header:'Açıklama',key:'description'},{header:'Süre',key:'hours_worked',render:(v)=>`${v} sa`}], 'daily_activities');
            }
        });
        document.getElementById('main-content').addEventListener('click', (e) => {
            const itemRow = e.target.closest('tr');
            const itemData = itemRow && itemRow.dataset.item ? JSON.parse(itemRow.dataset.item) : {};
            const addButton = e.target.closest('.add-btn'), editButton = e.target.closest('.edit-btn'), deleteButton = e.target.closest('.delete-btn'), ganttButton = e.target.closest('.gantt-view-btn');

            if (addButton) {
                const module = addButton.dataset.module;
                switch(module) {
                    case 'work_codes': showFormModal('Yeni İş Kodu Ekle', getWorkCodeFormHtml(), handleWorkCodeSubmit); break;
                    case 'daily_activities': showFormModal('Yeni Günlük Rapor Ekle', getDailyActivityFormHtml(), handleDailyActivitySubmit); populateDropdown(document.querySelector('select[name="projectId"]'),'api/projects.php','id','name','Proje Seçin'); populateDropdown(document.querySelector('select[name="workCodeId"]'),'api/work_codes.php','id','description','İş Kodu Seçin'); break;
                    case 'employees': showFormModal('Yeni Personel Ekle', getEmployeeFormHtml(), handleEmployeeSubmit); const deptSelect=getEl('form-department-select'); populateDropdown(deptSelect,'api/departments.php','id','name','Departman Seçin'); deptSelect.addEventListener('change',(ev)=>{const posSelect=getEl('form-position-select');posSelect.innerHTML=ev.target.value?'':'<option value="">-- Önce Departman Seçin --</option>';if(ev.target.value)populateDropdown(posSelect,'api/positions.php','id','name','Pozisyon Seçin',{key:'departmentId',value:ev.target.value});}); break;
                }
            } else if (editButton) {
                const module = editButton.dataset.module;
                 switch(module) {
                    case 'work_codes': showFormModal('İş Kodunu Düzenle', getWorkCodeFormHtml(itemData), handleWorkCodeSubmit); break;
                    case 'daily_activities': showFormModal('Günlük Raporu Düzenle',getDailyActivityFormHtml(itemData),handleDailyActivitySubmit); populateDropdown(document.querySelector('select[name="projectId"]'),'api/projects.php','id','name','Proje Seçin',null,itemData.project_id); populateDropdown(document.querySelector('select[name="workCodeId"]'),'api/work_codes.php','id','description','İş Kodu Seçin',null,itemData.work_code_id); break;
                    case 'employees': showFormModal('Personeli Düzenle',getEmployeeFormHtml(itemData),handleEmployeeSubmit); const deptSelect=getEl('form-department-select'); populateDropdown(deptSelect,'api/departments.php','id','name','Departman Seçin',null,itemData.department_id).then(()=>{if(itemData.department_id){const posSelect=getEl('form-position-select');populateDropdown(posSelect,'api/positions.php','id','name','Pozisyon Seçin',{key:'departmentId',value:itemData.department_id},itemData.position_id);}}); deptSelect.addEventListener('change',(ev)=>{const posSelect=getEl('form-position-select');posSelect.innerHTML=ev.target.value?'':'<option value="">-- Önce Departman Seçin --</option>';if(ev.target.value)populateDropdown(posSelect,'api/positions.php','id','name','Pozisyon Seçin',{key:'departmentId',value:ev.target.value});}); break;
                 }
            } else if (deleteButton) {
                const module = deleteButton.dataset.module;
                const pageLoaderKey = Object.keys(pageLoaders).find(k => k.toLowerCase().includes(module));
                if(module && pageLoaderKey) deleteItem(module, deleteButton.dataset.id, pageLoaders[pageLoaderKey]);
            } else if (ganttButton) {
                ganttChartView = ganttButton.dataset.view;
                renderGanttChart();
            }
        });
    }

    async function initializeApp() {
        injectModalStyles();
        setupEventListeners();
        await checkAuthStatus();
    }

    initializeApp();
});