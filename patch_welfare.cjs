const fs = require('fs');
let content = fs.readFileSync('src/pages/WelfareAdmin.tsx', 'utf8');

// 1. Import toast if missing
if (!content.includes('import { toast } from "sonner";')) {
  content = 'import { toast } from "sonner";\n' + content;
}

// 2. Add local state
const stateMarker = '  const [premium, setPremium] = useState("");';
if (!content.includes('const [settlementAmounts, setSettlementAmounts]')) {
  content = content.replace(stateMarker, stateMarker + '\n  const [settlementAmounts, setSettlementAmounts] = useState<Record<string, string>>({});');
}

const regex = /\{claim\.status === "SETTLEMENT_PROCESSING" && \([\s\S]*?Mark as Settled\s*<\/Button>\s*<\/div>\s*\)\}/;

const newBlock = `{claim.status === "SETTLEMENT_PROCESSING" && (
                      <div className="flex gap-2 items-center">
                        <span className="text-sm font-medium">₹</span>
                        <Input
                          type="number"
                          placeholder="Amount"
                          className="w-24 h-9"
                          value={settlementAmounts[claim.id] || ""}
                          onChange={(e) => setSettlementAmounts(prev => ({ ...prev, [claim.id]: e.target.value }))}
                        />
                        <Button size="sm" variant="outline" className="border-green-500 text-green-700" onClick={async () => {
                           const amount = settlementAmounts[claim.id];
                           const numAmount = Number(amount);
                           if (!amount || isNaN(numAmount) || numAmount <= 0) {
                             toast.error("Please enter a valid positive settlement amount");
                             return;
                           }
                           try {
                             const res = await fetch(\`/api/welfare/claims/\${claim.id}/status\`, {
                               method: "PUT",
                               headers: { "Content-Type": "application/json" },
                               body: JSON.stringify({ status: "SETTLED", settlementAmount: numAmount })
                             });
                             const data = await res.json();
                             if (!res.ok) throw new Error(data.error || "Failed to settle claim");
                             toast.success("Claim settled successfully");
                             fetchData();
                           } catch (err) {
                             toast.error(err.message || "An error occurred");
                           }
                        }}>
                          Mark as Settled
                        </Button>
                      </div>
                    )}`;

if (regex.test(content)) {
  content = content.replace(regex, newBlock);
  fs.writeFileSync('src/pages/WelfareAdmin.tsx', content);
  console.log("Successfully patched WelfareAdmin.tsx");
} else {
  console.log("Could not find regex match!");
}
