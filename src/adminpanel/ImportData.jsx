import { useState } from "react";
import ImportExcel from "./ImportExcel";

import "./css/import.css";
import ImportJson from "./Importjson ";

function ImportData(props) {
    const [tab, setTab] = useState("excel");

    return (
        <>
            <div className="imp-tabs" role="tablist">
                <button type="button" role="tab" aria-selected={tab === "excel"} className={tab === "excel" ? "on" : ""} onClick={() => setTab("excel")}>
                    📊 Excel
                </button>
                <button type="button" role="tab" aria-selected={tab === "json"} className={tab === "json" ? "on" : ""} onClick={() => setTab("json")}>
                    🧾 JSON
                </button>
            </div>

            {tab === "excel" ? <ImportExcel {...props} /> : <ImportJson {...props} />}
        </>
    );
}

export default ImportData;