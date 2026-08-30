import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, ShieldCheck, Mail, Trash2 } from "lucide-react";
import { useTranslation } from "../i18n";
import { LocationPicker, LocationData } from "@/components/LocationPicker";

export default function ProfilePage() {
    const { t } = useTranslation();
  const [profile, setProfile] = useState<any>(null);
  const [reviewsData, setReviewsData] = useState<any>(null);
  const [trustData, setTrustData] = useState<any>(null);
  const [kycData, setKycData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  
  const [editForm, setEditForm] = useState<{fullName: string, bio: string, location?: string, locationLat?: number, locationLng?: number, address?: string, landmark?: string, city?: string, state?: string, avatarUrl?: string}>({ fullName: "", bio: "" });
  const [newSkill, setNewSkill] = useState("");
  const [certifyModal, setCertifyModal] = useState<{isOpen: boolean, skillId: string, skillName: string}>({isOpen: false, skillId: "", skillName: ""});
  const [certifyFile, setCertifyFile] = useState<File | null>(null);

  const fetchProfileAndMetrics = async () => {
    try {
      const res = await fetch("/api/profile/me");
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setEditForm({
          fullName: data.profile.fullName || "",
          bio: data.profile.bio || "",
          location: data.profile.location || "",
          locationLat: data.profile.locationLat || 0,
          locationLng: data.profile.locationLng || 0,
          address: data.profile.address || "",
          landmark: data.profile.landmark || "",
          city: data.profile.city || "",
          state: data.profile.state || "",
          avatarUrl: data.profile.avatarUrl || ""
        });
        
        const userId = data.profile.userId;

        Promise.all([
          fetch(`/api/users/${userId}/reviews`).then(r => r.json()),
          fetch(`/api/users/${userId}/trust`).then(r => r.json()),
          fetch(`/api/kyc/status`).then(r => r.json())
        ]).then(([revData, trData, kData]) => {
          if (revData) setReviewsData(revData);
          if (trData && !trData.error) setTrustData(trData);
          if (kData && kData.kyc) setKycData(kData.kyc);
        }).catch(err => { console.log(err); });
      }
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileAndMetrics();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/profile/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm)
    });
    if (res.ok) {
      const data = await res.json();
      setProfile({ ...profile, ...data.profile });
      setIsEditing(false);
    }
  };

  const handleKycInitiate = async () => {
    try {
      const res = await fetch("/api/kyc/initiate", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(`Redirecting to KYC flow: ${data.sessionUrl}`);
        const webhookRes = await fetch("/api/kyc/webhook", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerKey: data.kyc.providerKey, status: "approved" })
        });
        if (webhookRes.ok) {
          alert("KYC Approved mock completed!");
          fetchProfileAndMetrics();
        }
      } else {
        alert(typeof data.error === "string" ? data.error : (data.error?.formErrors?.[0] || JSON.stringify(data.error)));
      }
    } catch(e) {}
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkill.trim()) return;
    const res = await fetch("/api/profile/skills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newSkill.trim() })
    });
    if (res.ok) {
      const data = await res.json();
      setProfile({ ...profile, skills: data.profile.skills });
      setNewSkill("");
    }
  };

  const handleRemoveSkill = async (skillId: string) => {
    const res = await fetch(`/api/profile/skills/${skillId}`, { method: "DELETE" });
    if (res.ok) {
      const data = await res.json();
      setProfile({ ...profile, skills: data.profile.skills });
    }
  };

  if (loading) return <div>{t("ui.loading_profile")}</div>;
  if (!profile) return <div>{t("ui.failed_to_load")}</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {(!kycData || kycData.status !== "VERIFIED") && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded flex items-center justify-between">
          <div className="text-sm">
            <span className="font-semibold block sm:inline">{t("ui.verification_required")}</span>
            <span className="block sm:inline">{t("ui.you_must_be")}</span>
          </div>
          <Button size="sm" variant="outline" className="border-amber-300 text-amber-800 bg-amber-100 hover:bg-amber-200 shrink-0 ml-4" onClick={handleKycInitiate}>
            {t("ui.verify_now")}</Button>
        </div>
      )}
      
      {/* Header Profile Info */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-end mb-8 pt-4">
        <Avatar className="h-24 w-24 border-4 border-white shadow-sm ring-1 ring-slate-100">
          <AvatarImage src={profile.avatarUrl} className="object-cover" />
          <AvatarFallback className="text-3xl bg-blue-50 text-blue-600">
            {(profile.fullName || profile.user?.email || "U").substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{profile.fullName || profile.user?.email?.split('@')[0] || "Anonymous User"}</h1>
          <div className="flex items-center gap-4 text-sm text-slate-500 mt-1 flex-wrap">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {profile.location || t("ui.global")}</span>
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 text-amber-400" /> {profile.trustScore} {t("ui.trust_score")}</span>
            <span className="flex items-center gap-1"><Mail className="h-4 w-4" /> {profile.user.email}</span>
          </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
          <Button variant="outline" onClick={() => setIsEditing(!isEditing)} className="w-full md:w-auto text-blue-600 border-blue-200 hover:bg-blue-50">
            {isEditing ? "Cancel Edit" : "Edit Profile"}
          </Button>
        </div>
      </div>

      {isEditing && (
        <Card>
          <CardHeader>
            <CardTitle>{t("ui.edit_profile")}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Profile Image</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const formData = new FormData();
                    formData.append("avatar", file);
                    try {
                      const res = await fetch("/api/profile/avatar", {
                        method: "POST",
                        body: formData
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setEditForm(prev => ({...prev, avatarUrl: data.avatarUrl}));
                        setProfile(prev => ({...prev, avatarUrl: data.avatarUrl}));
                      }
                    } catch (err) {}
                  }}
                  className="w-full border rounded-md p-2 text-sm"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">{t("ui.full_name")}</label>
                <input 
                  type="text" 
                  value={editForm.fullName} 
                  onChange={e => setEditForm({...editForm, fullName: e.target.value})}
                  className="w-full border rounded-md p-2"
                />
              </div>
              <div className="mb-4 space-y-2">
                <label className="block text-sm font-medium mb-1">Service Location</label>
                <LocationPicker 
                  initialLocation={
                    editForm.locationLat && editForm.locationLng 
                      ? { 
                          address: editForm.address || editForm.location || "", 
                          landmark: editForm.landmark || "", city: editForm.city || "", state: editForm.state || "", 
                          locationLat: editForm.locationLat, 
                          locationLng: editForm.locationLng 
                        } 
                      : null
                  }
                  onLocationSelect={(loc: LocationData) => {
                    setEditForm(prev => ({
                      ...prev, 
                      location: loc.address || loc.city || "Selected Location", 
                      locationLat: loc.locationLat, 
                      locationLng: loc.locationLng,
                      address: loc.address,
                      landmark: loc.landmark,
                      city: loc.city,
                      state: loc.state
                    }));
                  }}
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">{t("ui.bio")}</label>
                <textarea 
                  value={editForm.bio} 
                  onChange={e => setEditForm({...editForm, bio: e.target.value})}
                  className="w-full border rounded-md p-2"
                  rows={4}
                />
              </div>
              <Button type="submit">{t("ui.save_changes")}</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("ui.trust_verification")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className={`h-5 w-5 ${kycData?.status === 'VERIFIED' ? 'text-green-500' : 'text-amber-500'}`} />
                <div>
                  <p className="text-sm font-medium">{t("ui.identity_kyc")}</p>
                  <p className="text-xs text-muted-foreground">{kycData?.status || 'UNVERIFIED'}</p>
                </div>
              </div>
              {(!kycData || kycData.status !== 'VERIFIED') && (
                <Button size="sm" onClick={handleKycInitiate} className="w-full mt-2">
                  {t("ui.verify_identity")}</Button>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("ui.skills")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddSkill} className="flex gap-2 mb-4">
                <input 
                  type="text" 
                  value={newSkill} 
                  onChange={e => setNewSkill(e.target.value)}
                  placeholder="Add skill..."
                  className="flex-1 border rounded-md p-1 min-w-0 text-sm"
                />
                <Button type="submit" size="sm">{t("ui.add")}</Button>
              </form>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill: any) => {
                  const cert = profile.certifications?.find((c: any) => c.skillId === skill.id);
                  let certLabel = "Claimed";
                  let certColor = "text-slate-500";
                  if (cert) {
                    if (cert.status === "VERIFIED") { certLabel = "✓ Verified"; certColor = "text-green-600"; }
                    if (cert.status === "PENDING") { certLabel = "⏳ Pending"; certColor = "text-yellow-600"; }
                    if (cert.status === "REJECTED") { certLabel = "✗ Rejected"; certColor = "text-red-600"; }
                  }
                  
                  return (
                  <Badge key={skill.id} variant="secondary" className="pr-1 flex items-center gap-1">
                    <span>{skill.name}</span>
                    <span className={`text-xs ml-1 ${certColor}`}>({certLabel})</span>
                    {!cert || cert.status === "REJECTED" ? (
                      
                      <button onClick={() => setCertifyModal({isOpen: true, skillId: skill.id, skillName: skill.name})} className="hover:text-blue-500 ml-1 ml-2 text-xs" title="Request Certification">
                        {t("ui.certify")}</button>

                    ) : null}
                    <button onClick={() => handleRemoveSkill(skill.id)} className="hover:text-red-500 ml-1">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Badge>
                )
                })}
                {profile.skills.length === 0 && <span className="text-sm text-slate-500">{t("ui.no_skills_added")}</span>}
              </div>
            </CardContent>
          </Card>

          {trustData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("ui.detailed_metrics")}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-4 text-slate-600">
                <div className="flex justify-between items-center pb-2 border-b">
                   <span>{t("ui.trust_score")}</span> 
                   <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{Number(trustData.trustScore).toFixed(1).replace(/\.0$/, '')}</Badge>
                </div>
                <div className="flex justify-between"><span>{t("ui.total_tasks")}</span> <span>{trustData.tasksCompleted + trustData.tasksCancelled}</span></div>
                <div className="flex justify-between"><span>{t("ui.completion_rate")}</span> <span>{(trustData.completionRate * 100).toFixed(0)}%</span></div>
                <div className="flex justify-between"><span>{t("ui.avg_rating")}</span> <span>{Number(trustData.avgRating).toFixed(1)} / 5</span></div>
                <div className="flex justify-between"><span>{t("ui.total_earned")}</span> <span>${Number(trustData.totalEarnings).toFixed(2)}</span></div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("ui.about_me")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600 text-sm leading-relaxed">
                {profile.bio || "This user hasn't added a bio yet."}
              </p>
            </CardContent>
          </Card>

          {reviewsData && reviewsData.reviews && reviewsData.reviews.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("ui.reviews")}{reviewsData.reviews.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {reviewsData.reviews.map((r: any) => (
                   <div key={r.id} className="border-b last:border-0 pb-4 last:pb-0">
                     <div className="flex justify-between items-start mb-2">
                       <div className="flex items-center gap-2">
                         <Avatar className="h-8 w-8">
                           <AvatarFallback>{r.reviewer?.profile?.fullName?.[0] || 'U'}</AvatarFallback>
                         </Avatar>
                         <div className="text-sm">
                           <p className="font-semibold">{r.reviewer?.profile?.fullName || 'Anonymous'}</p>
                           <p className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()} {t("ui.as")}{r.type}</p>
                         </div>
                       </div>
                       <Badge variant="outline" className="text-amber-500 border-amber-200 bg-amber-50">★ {r.rating}</Badge>
                     </div>
                     <p className="text-sm text-slate-700 italic">"{r.comment}"</p>
                     <p className="text-xs text-slate-400 mt-1">{t("ui.task")}{r.task?.title}</p>
                   </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {certifyModal.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold">Certify Skill: {certifyModal.skillName}</h3>
            <p className="text-sm text-slate-600">Please upload a document (PDF or Image) to verify your skill.</p>
            <input 
              type="file"
              onChange={(e) => setCertifyFile(e.target.files?.[0] || null)}
              className="w-full border rounded-md p-2 text-sm"
            />
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => { setCertifyModal({isOpen: false, skillId: "", skillName: ""}); setCertifyFile(null); }}>Cancel</Button>
              <Button onClick={async () => {
                if (!certifyFile) return;
                const formData = new FormData();
                formData.append("evidence", certifyFile);
                try {
                  const res = await fetch(`/api/profile/skills/${certifyModal.skillId}/certify`, {
                    method: "POST",
                    body: formData
                  });
                  if (res.ok) {
                    alert('Certification requested');
                    setCertifyModal({isOpen: false, skillId: "", skillName: ""});
                    setCertifyFile(null);
                    fetchProfileAndMetrics();
                  } else {
                    const err = await res.json();
                    alert(err.error || 'Failed to request certification');
                  }
                } catch (e) {
                  console.error(e);
                  alert('Error uploading document');
                }
              }}>{t("ui.submit")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}
