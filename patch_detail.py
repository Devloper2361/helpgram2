import re

with open('src/pages/TaskDetail.tsx', 'r') as f:
    content = f.read()

# 1. State variables
target1 = """  const [isApplying, setIsApplying] = useState(false);"""
replacement1 = """  const [isApplying, setIsApplying] = useState(false);
  const [service, setService] = useState<any>(null);
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  const [applyError, setApplyError] = useState<any>(null);"""

# 2. fetchTask update
target2 = """        if (payload.task) {
           setEditForm({"""
replacement2 = """        if (payload.task) {
           if (payload.task.serviceId) {
             fetch(`/api/services/${payload.task.serviceId}`).then(r => r.ok ? r.json() : null).then(d => {
               if (d && d.service) setService(d.service);
             }).catch(() => {});
           }
           setEditForm({"""

# 3. useEffect currentUser update
target3 = """  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) setCurrentUser(d.user);
    }).catch(() => {});
    fetchTask();
  }, [id]);"""
replacement3 = """  useEffect(() => {
    fetch("/api/auth/me").then(r => r.json()).then(d => {
      if (d.user) {
        setCurrentUser(d.user);
        if (d.user.role === 'WORKER') {
          fetch("/api/profile/me").then(r => r.ok ? r.json() : null).then(pd => {
            if (pd && pd.profile) setWorkerProfile(pd.profile);
          }).catch(() => {});
        }
      }
    }).catch(() => {});
    fetchTask();
  }, [id]);"""

# 4. handleApply update
target4 = """  const handleApply = async () => {
    if (!currentUser) {
      alert("Please log in to apply");
      return;
    }
    try {
      const res = await fetch(`/api/tasks/${id}/apply`, {"""
replacement4 = """  const handleApply = async () => {
    if (!currentUser) {
      alert("Please log in to apply");
      return;
    }
    setApplyError(null);
    try {
      const res = await fetch(`/api/tasks/${id}/apply`, {"""

target5 = """      if (res.ok) {
        alert("Applied successfully!");
        setIsApplying(false);
        fetchTask();
      } else {
        const data = await res.json();
        alert(data.error);
      }"""
replacement5 = """      if (res.ok) {
        alert("Applied successfully!");
        setIsApplying(false);
        fetchTask();
      } else {
        const data = await res.json();
        if (res.status === 403) {
          setApplyError(data);
        } else {
          alert(data.error || "Failed to apply");
        }
      }"""

# 6. Service Detail Card in UI
target6 = """            <Card>
              <CardHeader><CardTitle>Description</CardTitle></CardHeader>
              <CardContent className="whitespace-pre-wrap leading-relaxed text-slate-700">
                {task.description}
              </CardContent>
            </Card>
          )}"""
replacement6 = """            <Card>
              <CardHeader><CardTitle>Description</CardTitle></CardHeader>
              <CardContent className="whitespace-pre-wrap leading-relaxed text-slate-700">
                {task.description}
              </CardContent>
            </Card>
          )}

          {service && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Structured Service: {service.name}</span>
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-50">Service Task</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600">{service.description}</p>
                {service.skills && service.skills.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-700">Required Skills</h4>
                    <div className="flex gap-2 flex-wrap">
                      {service.skills.map((skill: any) => {
                        const hasSkill = workerProfile?.skills?.some((ws: any) => ws.id === skill.id);
                        return (
                          <Badge key={skill.id} variant={hasSkill ? "default" : "outline"} className={hasSkill ? "bg-green-100 text-green-700 hover:bg-green-100 border-none" : ""}>
                            {skill.name} {hasSkill && "✓"}
                          </Badge>
                        );
                      })}
                    </div>
                    {currentUser?.role === 'WORKER' && (
                      <p className="text-xs text-slate-500 mt-2">
                        * Claimed skills are matched against requirements. Claimed skills are self-declared and unverified.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 italic">This service requires no specific skills.</div>
                )}
              </CardContent>
            </Card>
          )}

          {task.serviceId === null && (
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center justify-between">
                <span>Legacy Task</span>
                <Badge variant="outline" className="text-xs bg-slate-100 text-slate-700 hover:bg-slate-100">General</Badge>
              </CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-slate-600">
                  This is a general task that is not tied to a specific structured service. Any eligible worker may apply.
                </p>
              </CardContent>
            </Card>
          )}"""

# 7. Apply error UI
target7 = """                   <textarea
                    placeholder="Why are you a good fit?"
                    className="w-full border p-2 rounded text-sm"
                    rows={3}
                    value={applyMessage}
                    onChange={e => setApplyMessage(e.target.value)}
                   />
                   <div className="flex gap-2">
                     <Button variant="outline" className="flex-1" onClick={() => setIsApplying(false)}>Cancel</Button>"""
replacement7 = """                   <textarea
                    placeholder="Why are you a good fit?"
                    className="w-full border p-2 rounded text-sm"
                    rows={3}
                    value={applyMessage}
                    onChange={e => setApplyMessage(e.target.value)}
                   />
                   {applyError && (
                     <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-100">
                       <p className="font-semibold">{applyError.error}</p>
                       {applyError.reason === 'MISSING_SKILLS' && applyError.missingSkills && (
                         <p className="mt-1">Missing required skills: {applyError.missingSkills.join(", ")}</p>
                       )}
                       {applyError.reason === 'CROSS_FEDERATION' && (
                         <p className="mt-1">You must belong to the cooperative federation that provides this service.</p>
                       )}
                       {applyError.reason === 'NO_ACTIVE_SOCIETY_MEMBERSHIP' && (
                         <p className="mt-1">You must have an active cooperative society membership to apply.</p>
                       )}
                       {applyError.reason === 'SERVICE_INACTIVE' && (
                         <p className="mt-1">The structured service for this task is currently inactive.</p>
                       )}
                     </div>
                   )}
                   <div className="flex gap-2">
                     <Button variant="outline" className="flex-1" onClick={() => { setIsApplying(false); setApplyError(null); }}>Cancel</Button>"""

# applying patches
content = content.replace(target1, replacement1)
content = content.replace(target2, replacement2)
content = content.replace(target3, replacement3)
content = content.replace(target4, replacement4)
content = content.replace(target5, replacement5)
content = content.replace(target6, replacement6)
content = content.replace(target7, replacement7)

with open('src/pages/TaskDetail.tsx', 'w') as f:
    f.write(content)

print("TaskDetail patched successfully")
