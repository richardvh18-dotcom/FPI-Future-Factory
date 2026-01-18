import React from "react";

const MatrixGrid = ({
  rows,
  columns,
  values,
  onUpdateRowLabel,
  onUpdateColLabel,
  onValueChange,
  onAddRow,
  onAddColumn,
}) => {
  return (
    <div
      className="grid-editor"
      style={{ marginTop: "20px", overflowX: "auto" }}
    >
      <div className="controls" style={{ marginBottom: "10px" }}>
        <button onClick={onAddRow} style={{ marginRight: "10px" }}>
          + Rij
        </button>
        <button onClick={onAddColumn}>+ Kolom</button>
      </div>

      <table
        className="matrix-table"
        border="1"
        cellPadding="5"
        style={{ width: "100%", borderCollapse: "collapse" }}
      >
        <thead>
          <tr>
            <th style={{ backgroundColor: "#f4f4f4", padding: "10px" }}>
              Matrix
            </th>
            {columns.map((col) => (
              <th key={col.id} style={{ padding: "5px" }}>
                <input
                  type="text"
                  value={col.label}
                  onChange={(e) => onUpdateColLabel(col.id, e.target.value)}
                  placeholder="Kolom label"
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <th style={{ width: "150px", padding: "5px" }}>
                <input
                  type="text"
                  value={row.label}
                  onChange={(e) => onUpdateRowLabel(row.id, e.target.value)}
                  placeholder="Rij label"
                  style={{ width: "100%", boxSizing: "border-box" }}
                />
              </th>
              {columns.map((col) => (
                <td key={`${row.id}_${col.id}`} style={{ padding: "0" }}>
                  <input
                    type="text"
                    value={values[`${row.id}_${col.id}`] || ""}
                    onChange={(e) =>
                      onValueChange(row.id, col.id, e.target.value)
                    }
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      padding: "10px",
                      boxSizing: "border-box",
                    }}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MatrixGrid;
