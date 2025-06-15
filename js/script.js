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
    let isLoggedIn = false, currentUserName = null, activeCharts = [];
    let allActivities = []; // Tarih filtresi için

    // ======================================================================
    // ==         2. GÖRSEL İYİLEŞTİRME VE ANİMASYON STİLLERİ              ==
    // ======================================================================
    function injectModalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeInUp {
                from { opacity: 0; transform: translate3d(0, 40px, 0) scale(0.97); }
                to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
            }
            @keyframes fadeOutDown {
                from { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
                to { opacity: 0; transform: translate3d(0, 30px, 0) scale(0.97); }
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

    // ======================================================================
    // ==             GANTT CHART & PLANNING PAGE LOGIC (GÜNCELLENDİ)    ==
    // ======================================================================

    // Bu global değişkenler Gantt şeması verilerini ve durumunu tutar
    let currentPlanItems = [], ganttMinDate, ganttMaxDate;
    let ganttChartView = 'daily'; // 'daily', 'weekly', 'monthly' gibi görünümler eklenebilir

    /**
     * Gün farkını hesaplayan yardımcı fonksiyon.
     * @param {Date} d1 İlk tarih
     * @param {Date} d2 İkinci tarih
     * @returns {number} İki tarih arasındaki gün sayısı
     */
    function dateDiffInDays(d1, d2) {
        const _MS_PER_DAY = 1000 * 60 * 60 * 24;
        const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
        const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
        return Math.floor((utc2 - utc1) / _MS_PER_DAY);
    }

    /**
     * Zaman çizelgesini (sağ taraf) ve bugünün işaretçisini çizer.
     */
    function drawGanttTimeScale() {
        const timelineGrid = document.querySelector('.gantt-timeline-grid');
        if (!timelineGrid) return;
        
        timelineGrid.innerHTML = ''; // Önceki çizimi temizle

        const totalDays = dateDiffInDays(ganttMinDate, ganttMaxDate) + 1;
        timelineGrid.style.gridTemplateColumns = `repeat(${totalDays}, 40px)`;
        
        const today = new Date();
        today.setHours(0,0,0,0);

        let currentMonth = -1;
        for (let i = 0; i < totalDays; i++) {
            const dayDate = new Date(ganttMinDate);
            dayDate.setDate(ganttMinDate.getDate() + i);

            // Ay başlıklarını oluştur
            if (dayDate.getMonth() !== currentMonth) {
                currentMonth = dayDate.getMonth();
                const monthName = dayDate.toLocaleString('tr-TR', { month: 'long' });
                const year = dayDate.getFullYear();
                const monthHeader = document.createElement('div');
                monthHeader.className = 'gantt-month-header';
                monthHeader.textContent = `${monthName} ${year}`;
                monthHeader.style.gridColumnStart = i + 1;
                // Ayın kaç gün sürdüğünü hesaplayarak başlığı o kadar genişlet
                const daysInMonth = new Date(dayDate.getFullYear(), dayDate.getMonth() + 1, 0).getDate();
                const remainingDaysInMonth = daysInMonth - dayDate.getDate() + 1;
                monthHeader.style.gridColumnEnd = `span ${Math.min(remainingDaysInMonth, totalDays - i)}`;
                timelineGrid.appendChild(monthHeader);
            }

            // Gün başlıklarını oluştur
            const dayHeader = document.createElement('div');
            dayHeader.className = 'gantt-day-header';
            dayHeader.textContent = dayDate.getDate();
            dayHeader.style.gridRow = '2';
            dayHeader.style.gridColumn = `${i + 1}`;
            
            // Bugünün tarihini özel bir işaretçi ile vurgula
            if (dateDiffInDays(dayDate, today) === 0) {
                dayHeader.classList.add('gantt-today-marker');
                const todayLabel = document.createElement('div');
                todayLabel.className = 'gantt-today-label';
                todayLabel.textContent = 'Bugün';
                dayHeader.appendChild(todayLabel);
            }

            timelineGrid.appendChild(dayHeader);
        }
    }

    /**
     * Her bir aktivite için Gantt çubuklarını çizer.
     */
    function drawGanttBars() {
        const timelineGrid = document.querySelector('.gantt-timeline-grid');
        if (!timelineGrid) return;

        currentPlanItems.forEach((item, index) => {
            const startDate = new Date(item.start_date);
            const endDate = new Date(item.end_date);

            const startDayIndex = dateDiffInDays(ganttMinDate, startDate);
            const durationDays = dateDiffInDays(startDate, endDate) + 1;

            const ganttBar = document.createElement('div');
            ganttBar.className = 'gantt-bar';
            ganttBar.style.gridRow = `${index + 3}`; // 1. satır ay, 2. satır gün, 3'ten başla
            ganttBar.style.gridColumn = `${startDayIndex + 1} / span ${durationDays}`;
            ganttBar.title = `${item.activity_name}: ${item.start_date} - ${item.end_date}`;

            const ganttProgress = document.createElement('div');
            ganttProgress.className = 'gantt-progress';
            ganttProgress.style.width = `${item.progress_percentage}%`;
            ganttProgress.textContent = `${item.progress_percentage}%`;

            ganttBar.appendChild(ganttProgress);
            timelineGrid.appendChild(ganttBar);
        });
    }

    /**
     * Ana Gantt Şeması oluşturma fonksiyonu. HTML yapısını kurar ve diğer çizim fonksiyonlarını çağırır.
     */
    function renderGanttChart() {
        const screen = appScreens.planning;
        screen.innerHTML = ''; // Temizle

        if (!currentPlanItems || currentPlanItems.length === 0) {
            screen.innerHTML = `<div class="main-content-area"><p>Gösterilecek plan verisi bulunamadı.</p></div>`;
            return;
        }

        // Proje planındaki en erken ve en geç tarihleri bul
        const dates = currentPlanItems.flatMap(item => [new Date(item.start_date), new Date(item.end_date)]);
        ganttMinDate = new Date(Math.min(...dates));
        ganttMaxDate = new Date(Math.max(...dates));
        // Kenarlarda boşluk bırakmak için
        ganttMinDate.setDate(ganttMinDate.getDate() - 5);
        ganttMaxDate.setDate(ganttMaxDate.getDate() + 5);


        // Gantt Şeması'nın ana HTML iskeletini oluştur
        const ganttContainer = `
            <div class="main-content-area-full gantt-container">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-3xl font-bold text-blue-700">Proje Zaman Çizelgesi (Gantt)</h2>
                    <div class="flex items-center space-x-4">
                        <div class="flex rounded-md shadow-sm" role="group">
                          <button type="button" data-view="daily" class="gantt-view-btn active">Günlük</button>
                          <button type="button" data-view="weekly" class="gantt-view-btn">Haftalık</button>
                          <button type="button" data-view="monthly" class="gantt-view-btn">Aylık</button>
                        </div>
                    </div>
                </div>
                <div class="gantt-grid-container bg-white shadow-lg rounded-lg">
                    <div class="gantt-left-pane">
                        <div class="gantt-header gantt-activity-header">Aktivite</div>
                        <div class="gantt-header">Başlangıç</div>
                        <div class="gantt-header">Bitiş</div>
                        <div class="gantt-header">Bütçe (sa)</div>
                        <div class="gantt-header">Gerçek (sa)</div>
                        <div class="gantt-header">İlerleme</div>
                        ${currentPlanItems.map(item => `
                            <div class="gantt-activity-item" title="${item.activity_name}"><strong>${item.wbs_code}</strong> ${item.activity_name}</div>
                            <div class="gantt-date-item">${new Date(item.start_date).toLocaleDateString('tr-TR')}</div>
                            <div class="gantt-date-item">${new Date(item.end_date).toLocaleDateString('tr-TR')}</div>
                            <div class="gantt-hours-item">${item.budgeted_man_hour}</div>
                            <div class="gantt-hours-item">${item.actual_man_hour.toFixed(1)}</div>
                            <div class="gantt-progress-item">${item.progress_percentage}%</div>
                        `).join('')}
                    </div>
                    <div class="gantt-right-pane">
                        <div class="gantt-timeline-grid">
                           </div>
                    </div>
                </div>
            </div>
        `;
        screen.innerHTML = ganttContainer;

        // Çizim fonksiyonlarını çağır
        drawGanttTimeScale();
        drawGanttBars();
    }


    /**
     * Planlama sayfasını yükler. API'den verileri çeker ve Gantt şemasını render eder.
     */
    async function loadPlanningPage() {
        destroyActiveCharts();
        const screen = appScreens.planning;
        screen.innerHTML = `<div class="main-content-area-full"><p>Yükleniyor...</p></div>`;
        try {
            const response = await authenticatedFetch('api/planning.php');
            const result = await response.json();
            if (result.success) {
                currentPlanItems = result.data.plan_items; // API'den gelen veriyi sakla
                renderGanttChart(); // Gantt'ı çiz
            } else {
                screen.innerHTML = `<p class="text-red-500">Planlama verileri yüklenemedi: ${result.message}</p>`;
            }
        } catch (error) {
            screen.innerHTML = `<p class="text-red-500">Hata: ${error.message}</p>`;
        }
    }

    async function loadPlanningChartsPage() {
        loadPlaceholderPage("Proje Grafikleri"); // Bu sayfa istendiğinde şimdilik placeholder göster
    }


    // ======================================================================
    // ==                    9. PAGE ROUTING & MANAGEMENT                  ==
    // ======================================================================
    const pageLoaders = { dashboard: loadDashboard, projects: loadProjectsPage, workCodes: loadWorkCodesPage, dailyActivities: loadDailyActivitiesPage, personnel: loadPersonnelPage, cardSwipes: loadCardSwipesPage, planning: loadPlanningPage, planningCharts: loadPlanningChartsPage, placeholder: (p) => loadPlaceholderPage(p.title) };
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
                // Bu kısım gelecekte haftalık/aylık görünümler için kullanılabilir.
                document.querySelectorAll('.gantt-view-btn').forEach(b => b.classList.remove('active'));
                ganttButton.classList.add('active');
                ganttChartView = ganttButton.dataset.view;
                // Şimdilik sadece renderGanttChart'ı tekrar çağırıyoruz, 
                // ileride farklı view'lar için mantık eklenebilir.
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