import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, ShieldCheck } from "lucide-react";
import { useTranslation } from "../i18n";

export default function PublicProfilePage() {
    const { t } = useTranslation();
  const { userId } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [reviewsData, setReviewsData] = useState<any>(null);
  const [trustData, setTrustData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    Promise.all([
      fetch(`/api/profile/${userId}`).then(r => r.json()),
      fetch(`/api/users/${userId}/reviews`).then(r => r.json()),
      fetch(`/api/users/${userId}/trust`).then(r => r.json())
    ]).then(([profileData, revData, trData]) => {
      if (profileData.profile) setProfile(profileData.profile);
      if (revData) setReviewsData(revData);
      if (trData && !trData.error) setTrustData(trData);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div>{t("ui.loading_profile")}</div>;
  if (!profile) return <div>{t("ui.profile_not_found")}</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-end mb-8 pt-4">
        <Avatar className="h-24 w-24 border-4 border-white shadow-sm ring-1 ring-slate-100">
          <AvatarFallback className="text-3xl bg-blue-50 text-blue-600">
            {(profile.fullName || "User").substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{profile.fullName || "Anonymous User"}</h1>
          <div className="flex items-center gap-4 text-sm text-slate-500 mt-1 flex-wrap">
            <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {t("ui.global")}</span>
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 text-amber-400" /> {profile.trustScore} {t("ui.trust_score")}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("ui.trust_verification")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className={`h-5 w-5 ${profile.isVerified ? 'text-green-500' : 'text-slate-300'}`} />
                <div>
                  <p className="text-sm font-medium">{t("ui.identity_verified")}</p>
                  <p className="text-xs text-muted-foreground">{profile.isVerified ? 'Verified' : 'Pending verification'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t("ui.skills")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.skills?.map((skill: any) => (
                  <Badge key={skill.id} variant="secondary">{skill.name}</Badge>
                ))}
                {(!profile.skills || profile.skills.length === 0) && <span className="text-sm text-slate-500">{t("ui.no_skills_added")}</span>}
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
                   <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">{Number(trustData.trustScore).toFixed(1)}</Badge>
                </div>
                <div className="flex justify-between"><span>{t("ui.total_tasks")}</span> <span>{trustData.tasksCompleted + trustData.tasksCancelled}</span></div>
                <div className="flex justify-between"><span>{t("ui.completion_rate")}</span> <span>{(trustData.completionRate * 100).toFixed(0)}%</span></div>
                <div className="flex justify-between"><span>{t("ui.avg_rating")}</span> <span>{Number(trustData.avgRating).toFixed(1)} / 5</span></div>
                <div className="flex justify-between"><span>{t("ui.tasks_cancelled")}</span> <span>{trustData.tasksCancelled}</span></div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("ui.about_user")}</CardTitle>
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
    </div>
  );
}
